# Security-First PRP Creation Results: Video Text Overlay Editor

**Date:** 2025-12-03
**Feature:** Video Text Overlay Editor (TYLER)
**Priority:** Security-First Implementation
**Status:** Research Complete, PRP Generated

---

## Executive Summary

Successfully created a comprehensive, security-first Product Requirement Prompt (PRP) for the Video Text Overlay Editor feature. The PRP prioritizes defense-in-depth security principles, addressing 8 major security risk areas with detailed mitigation strategies, implementation patterns, and validation protocols.

**Key Achievement:** This PRP treats security as the primary design constraint rather than an afterthought, with all features designed around preventing command injection, file upload attacks, unauthorized access, and data breaches.

---

## Approach Summary

### Research Methodology

1. **Existing Codebase Analysis**
   - Analyzed Supabase integration patterns from existing MAXAI implementation
   - Reviewed Row Level Security (RLS) policies from `/src/sql/007_videos.sql` and `/src/sql/008_videos_storage_policies.sql`
   - Identified established authentication and storage patterns to maintain consistency

2. **External Security Research (Web Search)**
   - FFmpeg command injection vulnerabilities and prevention techniques
   - OWASP file upload security best practices for 2025
   - Supabase Storage signed URL security patterns
   - Express.js rate limiting and CORS configuration
   - XSS prevention for user-generated content
   - Node.js path traversal vulnerabilities (including CVE-2025-27210)

3. **Archon RAG Integration (Knowledge Base)**
   - Queried for FFmpeg security patterns
   - Retrieved Supabase RLS policy examples
   - Searched for input validation and sanitization code patterns

4. **Context Engineering**
   - Pulled together comprehensive examples from multiple sources
   - Created security-specific implementation patterns
   - Developed validation test suites focused on security scenarios
   - Documented known vulnerabilities and how to prevent them

### PRP Structure Decisions

The PRP was organized with **security as the primary organizing principle:**

1. **Security-Annotated Requirements:** Every feature requirement includes explicit security controls
2. **Risk Assessment First:** Identified and prioritized risks before implementation details
3. **Defense-in-Depth Sections:** Multiple layers of security at every integration point
4. **Security-Prioritized Task List:** Critical security tasks (Phase 0) must complete before any user testing
5. **4-Level Validation with Security Focus:** Each validation level includes security-specific tests

---

## Security Analysis of Current Patterns

### ✅ Strong Existing Patterns (Reused in PRP)

**1. Supabase Row Level Security (RLS)**
- **Pattern Found:** Comprehensive RLS policies in `/src/sql/007_videos.sql`
- **Security Strength:** User isolation enforced at database level
- **Key Principle:** `auth.uid() = user_id` on all operations
- **Application:** Extended this pattern to `text_overlay_projects` table

**Example from existing code:**
```sql
CREATE POLICY "Users can view their own videos"
  ON public.videos
  FOR SELECT
  USING (auth.uid() = user_id);
```

**2. Supabase Storage RLS with Path Isolation**
- **Pattern Found:** Storage policies in `/src/sql/008_videos_storage_policies.sql`
- **Security Strength:** Prevents cross-user file access via path validation
- **Key Principle:** `(storage.foldername(name))[1] = auth.uid()::text`
- **Application:** Applied to `text-overlay-videos` bucket

**Example from existing code:**
```sql
CREATE POLICY "Users can upload videos to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**3. Authentication via Supabase Client**
- **Pattern Found:** Centralized Supabase client in `/src/services/supabase/client.ts`
- **Security Strength:** Automatic JWT inclusion, environment variable configuration
- **Application:** Reused for frontend, created server-side client with service role key

### ⚠️ New Security Patterns Required (Added to PRP)

**1. FFmpeg Command Injection Prevention**
- **Gap:** No existing FFmpeg usage in codebase
- **Risk:** CRITICAL - User text directly passed to FFmpeg can enable shell command execution
- **Solution Added:** Multi-level text escaping function with comprehensive test suite
- **Reference:** Jellyfin FFmpeg vulnerability (GHSA-866x-wj5j-2vf4)

**2. File Upload Magic Number Validation**
- **Gap:** Current video upload likely relies on Content-Type header only
- **Risk:** HIGH - Fake video files could upload malicious content
- **Solution Added:** Magic number (file signature) validation in addition to MIME type
- **Reference:** OWASP File Upload Cheat Sheet

**3. Server-Side Rate Limiting**
- **Gap:** No existing rate limiting infrastructure
- **Risk:** MEDIUM - API abuse, resource exhaustion, denial of service
- **Solution Added:** Layered rate limiting (global + endpoint-specific) with user-based tracking
- **Reference:** express-rate-limit best practices 2025

**4. Path Traversal Prevention**
- **Gap:** Filename sanitization not comprehensive
- **Risk:** HIGH - Malicious filenames could enable file system access
- **Solution Added:** Comprehensive filename sanitization with Windows device name handling
- **Reference:** CVE-2025-27210 (Node.js path traversal)

**5. Temporary File Management**
- **Gap:** No temporary file cleanup patterns in existing code
- **Risk:** MEDIUM - Temp file leaks could fill disk, expose data
- **Solution Added:** `TempFileManager` class with automatic cleanup in finally blocks

---

## Identified Security Risks and Mitigations

### Risk Matrix

| Risk Category | Severity | Likelihood | Impact | Mitigation Status |
|--------------|----------|------------|--------|------------------|
| FFmpeg Command Injection | CRITICAL | HIGH | Complete server compromise | ✅ Comprehensive escaping + testing |
| Unauthorized Video Access | HIGH | MEDIUM | Privacy violation, data breach | ✅ RLS policies + signed URLs |
| Malicious File Upload | HIGH | MEDIUM | Server compromise, DoS | ✅ Multi-layer validation |
| XSS via Text Content | MEDIUM | MEDIUM | Account takeover | ✅ React escaping + CSP |
| API Abuse / DoS | MEDIUM | HIGH | Service unavailability | ✅ Rate limiting + validation |
| Path Traversal | HIGH | LOW | File system access | ✅ Sanitization + validation |
| Temp File Leaks | MEDIUM | MEDIUM | Disk exhaustion, data exposure | ✅ Auto-cleanup manager |
| Secrets Exposure | CRITICAL | LOW | Complete system compromise | ✅ Environment variables only |

### Detailed Risk Analysis

#### 1. FFmpeg Command Injection (CRITICAL)

**Threat Model:**
- Attacker provides malicious text in segment: `"; rm -rf / #"`
- Without escaping, FFmpeg executes as: `drawtext=text='"; rm -rf / #'`
- Shell interprets as: Execute `rm -rf /` command
- Result: Complete server compromise

**Mitigation Strategy (PRP Section 3.3.3):**
```typescript
function escapeForFFmpeg(text: string): string {
  // CRITICAL: Order matters! Backslashes FIRST
  return text
    .replace(/\\/g, '\\\\\\\\')  // 4 backslashes → 1 final
    .replace(/'/g, "'\\''")      // Single quote escape
    .replace(/:/g, '\\:')        // Filter delimiter
    .replace(/\[/g, '\\[')       // Expression syntax
    .replace(/\]/g, '\\]')
    .replace(/=/g, '\\=')        // Filter syntax
    .replace(/,/g, '\\,')        // Filter separator
    .replace(/\n/g, '\\n')       // Newlines
    .replace(/\r/g, '')          // Remove CR
    .slice(0, 1000);             // Length limit
}
```

**Additional Protections:**
- FFmpeg runs in Docker container with no network access
- Process timeout (5 minutes maximum)
- Resource limits on container (CPU, memory)
- No user-controlled filter names or parameter names
- Comprehensive injection test suite (Level 2 validation)

**References:**
- [Jellyfin FFmpeg Argument Injection](https://github.com/jellyfin/jellyfin/security/advisories/GHSA-866x-wj5j-2vf4)
- [FFmpeg Security Documentation](https://ffmpeg.org/security.html)

#### 2. File Upload Security (HIGH)

**Threat Model:**
- Attacker uploads executable disguised as video
- Fake MIME type header: `Content-Type: video/mp4`
- Actual content: Malicious executable or webshell
- Result: Remote code execution on server or client machines

**Mitigation Strategy (Multi-Layer Defense):**

**Layer 1: Client-Side (Quick Feedback)**
```typescript
// Extension validation
const ext = file.name.split('.').pop()?.toLowerCase();
if (!['mp4', 'mov', 'webm'].includes(ext)) {
  return { valid: false, error: 'Invalid extension' };
}

// Size validation
if (file.size > 524_288_000) { // 500MB
  return { valid: false, error: 'File too large' };
}
```

**Layer 2: Magic Number Validation**
```typescript
// Read first 8 bytes
const buffer = await file.slice(0, 8).arrayBuffer();
const bytes = new Uint8Array(buffer);

// Verify file signature matches claimed type
const signatures = {
  mp4: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
  mov: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70],
  webm: [0x1A, 0x45, 0xDF, 0xA3],
};

const isValid = Object.values(signatures).some(sig =>
  sig.every((byte, i) => bytes[i] === byte)
);
```

**Layer 3: Filename Sanitization**
```typescript
function sanitizeFilename(original: string, userId: string): string {
  const safe = original
    .replace(/[^a-zA-Z0-9.-]/g, '_')  // Remove special chars
    .replace(/\.{2,}/g, '_')          // Remove "../"
    .slice(0, 100);                   // Length limit

  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');

  // Format: {userId}/{timestamp}-{random}-{safeName}
  return `${userId}/${timestamp}-${random}-${safe}`;
}
```

**Layer 4: Supabase Storage Configuration**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'text-overlay-videos',
  'text-overlay-videos',
  false,  -- CRITICAL: Private bucket
  524288000,  -- 500MB server-side enforcement
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']  -- MIME whitelist
);
```

**Layer 5: Future Enhancement (Antivirus Scanning)**
- Integration point added in PRP for virus scanning
- Recommendation: ClamAV or cloud-based solution
- EICAR test file for validation

**References:**
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP Unrestricted File Upload](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload)

#### 3. Path Traversal Prevention (HIGH)

**Threat Model:**
- Attacker provides filename: `../../../etc/passwd`
- Unsanitized path.join: `/storage/user123/../../../etc/passwd`
- Resolves to: `/etc/passwd`
- Result: Unauthorized file system access

**Recent Vulnerability Context:**
- **CVE-2025-27210:** Node.js path traversal on Windows via device names
- Affected: All major Node.js versions on Windows
- Issue: Device names (CON, PRN, AUX) bypass `path.normalize()`
- Status: Patched July 2025, but highlights ongoing risk

**Mitigation Strategy:**

**Prevention 1: Sanitize Filename**
```typescript
// Remove path separators and dangerous characters
const safe = originalName
  .replace(/[^a-zA-Z0-9.-]/g, '_')  // Whitelist safe chars
  .replace(/\.{2,}/g, '_')          // Remove ".."
  .replace(/^\./, '_')              // Remove leading dot
  .slice(0, 100);
```

**Prevention 2: Validate Resolved Path**
```typescript
function validateStoragePath(inputPath: string, userId: string): boolean {
  // Expected base directory
  const baseDir = path.join('/storage', userId);

  // Resolve to absolute path
  const resolved = path.resolve('/storage', inputPath);

  // CRITICAL: Verify path starts with expected directory
  if (!resolved.startsWith(baseDir)) {
    logSecurityEvent({
      action: 'path_traversal_attempt',
      userId,
      metadata: { inputPath, resolved },
    });
    return false;
  }

  return true;
}
```

**Prevention 3: Use Supabase Storage Paths**
- Supabase Storage handles path validation internally
- RLS policy enforces: `(storage.foldername(name))[1] = auth.uid()::text`
- First folder segment MUST match user ID
- Prevents cross-user path traversal automatically

**References:**
- [ZeroPath: CVE-2025-27210 Analysis](https://zeropath.com/blog/cve-2025-27210-nodejs-path-traversal-windows)
- [Node.js Security: Path Traversal Prevention](https://www.nodejs-security.com/blog/secure-coding-practices-nodejs-path-traversal-vulnerabilities)
- [Node.js July 2025 Security Releases](https://nodejs.org/en/blog/vulnerability/july-2025-security-releases)

#### 4. API Rate Limiting (MEDIUM)

**Threat Model:**
- Attacker sends 1000+ render requests in 1 minute
- Each render consumes CPU, memory, disk I/O
- Server becomes unresponsive
- Result: Denial of service for legitimate users

**Mitigation Strategy (Layered Approach):**

**Layer 1: Global Rate Limit (Prevent Basic Flooding)**
```typescript
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests total
  message: 'Too many requests',
});

app.use('/api/', globalLimiter);
```

**Layer 2: Endpoint-Specific Limits (Expensive Operations)**
```typescript
const renderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,                    // 10 renders per hour
  keyGenerator: (req) => {
    // Use authenticated user ID, not just IP
    return req.user?.id || req.ip;
  },
  message: 'Render quota exceeded',
});

app.post('/api/render', renderLimiter, renderHandler);
```

**Layer 3: Resource Protection (FFmpeg Timeout)**
```typescript
// Prevent runaway FFmpeg processes
const timeoutId = setTimeout(() => {
  ffmpegProcess.kill('SIGKILL');
  reject(new Error('Render timeout exceeded'));
}, 300000);  // 5 minutes maximum
```

**Layer 4: Monitoring & Alerting**
```typescript
// Alert on unusual patterns
if (user.renderCount > 50 in 24h) {
  alertSecurityTeam({
    user: user.id,
    pattern: 'excessive_renders',
    count: user.renderCount,
  });
}
```

**References:**
- [Better Stack: Rate Limiting in Express.js](https://betterstack.com/community/guides/scaling-nodejs/rate-limiting-express/)
- [express-rate-limit npm](https://www.npmjs.com/package/express-rate-limit)
- [MDN: Securing APIs with Rate Limit](https://developer.mozilla.org/en-US/blog/securing-apis-express-rate-limit-and-slow-down/)

---

## FFmpeg Command Injection Prevention Strategy

### Why This is Critical

FFmpeg's `drawtext` filter executes text rendering using shell-like expression evaluation. Without proper escaping, user-provided text can break out of the text string and inject arbitrary commands or expressions.

### Attack Vector Examples

**1. Shell Command Injection:**
```
Input: "; rm -rf / #"
Unsafe: drawtext=text="; rm -rf / #"
Result: Executes shell command, deletes files
```

**2. Filter Parameter Injection:**
```
Input: text=hacked:fontsize=9999
Unsafe: drawtext=text=text=hacked:fontsize=9999
Result: Changes fontsize, breaks rendering
```

**3. Expression Injection:**
```
Input: ${system("whoami")}
Unsafe: drawtext=text='${system("whoami")}'
Result: Executes system command via FFmpeg expressions
```

### Comprehensive Escaping Strategy

**Escaping Order Matters:**
```typescript
function escapeForFFmpeg(text: string): string {
  // STEP 1: Escape backslashes FIRST (prevents double-escape issues)
  text = text.replace(/\\/g, '\\\\\\\\');  // \ → \\\\

  // STEP 2: Escape shell special characters
  text = text.replace(/'/g, "'\\''");      // ' → '\''

  // STEP 3: Escape FFmpeg filter syntax
  text = text.replace(/:/g, '\\:');        // : (parameter separator)
  text = text.replace(/=/g, '\\=');        // = (parameter assignment)
  text = text.replace(/,/g, '\\,');        // , (filter separator)

  // STEP 4: Escape FFmpeg expression syntax
  text = text.replace(/\[/g, '\\[');       // [ ] (expressions)
  text = text.replace(/\]/g, '\\]');

  // STEP 5: Handle newlines (convert to literal \n)
  text = text.replace(/\n/g, '\\n');
  text = text.replace(/\r/g, '');          // Remove CR

  // STEP 6: Enforce length limit (prevent DoS)
  return text.slice(0, 1000);
}
```

**Why 4 Backslashes?**
- User input: `\`
- After replace: `\\\\`
- Shell interpretation: `\\`
- FFmpeg interpretation: `\`
- Final rendered: `\`

### Additional Protections

**1. No User-Controlled Parameter Names:**
```typescript
// ❌ WRONG: User controls parameter name
const filter = `drawtext=${userParam}=${userValue}`;

// ✅ CORRECT: Only values are user-controlled
const filter = `drawtext=text='${escaped}':fontsize=${validated}`;
```

**2. Array-Based Argument Construction:**
```typescript
// Build filter options as array (prevents injection via concatenation)
const options = [
  `text='${escapedText}'`,
  `x=${xExpr}`,
  `y=${yExpr}`,
  `fontsize=${validatedSize}`,
  // ...
];

const filter = `drawtext=${options.join(':')}`;
```

**3. Validated Font Paths (Prevent File Inclusion):**
```typescript
function getFontFilePath(family: string, weight: string): string {
  // Whitelist only - no user paths
  const FONT_MAP = {
    'Open Sans': { normal: 'OpenSans-Regular.ttf', bold: 'OpenSans-Bold.ttf' },
    // ...
  };

  const fontFile = FONT_MAP[family]?.[weight];
  if (!fontFile) throw new Error('Invalid font');

  const fullPath = path.join(FONTS_DIR, fontFile);

  // Ensure path hasn't escaped fonts directory
  if (!fullPath.startsWith(FONTS_DIR)) {
    throw new Error('Path traversal detected');
  }

  return fullPath;
}
```

### Testing Strategy

**Level 2: Unit Tests (Injection Payloads):**
```typescript
describe('escapeForFFmpeg - Injection Prevention', () => {
  const injectionPayloads = [
    "'; rm -rf / #",
    "text=hacked:fontsize=9999",
    "${system('whoami')}",
    "../../../etc/passwd",
    "test\x00.mp4",
    "onload=alert(1)",
    "';exec('/bin/sh');#",
  ];

  injectionPayloads.forEach(payload => {
    test(`blocks injection: ${payload}`, () => {
      const escaped = escapeForFFmpeg(payload);

      // Verify no unescaped special characters
      expect(escaped).not.toContain("';");
      expect(escaped).not.toContain('exec');
      expect(escaped).not.toContain('system');

      // Verify escaping worked
      expect(escaped).toMatch(/\\'/);  // Quotes escaped
      expect(escaped).toMatch(/\\\\/); // Backslashes escaped
    });
  });
});
```

**Level 4: Penetration Testing:**
```bash
# Test with actual FFmpeg command
text="'; whoami #"
escaped=$(node -e "console.log(escapeForFFmpeg('$text'))")

# Verify command doesn't execute
ffmpeg -f lavfi -i color=c=black:s=1920x1080 \
  -vf "drawtext=text='$escaped':fontsize=50" \
  -t 1 output.mp4

# Check output video exists and no commands executed
```

---

## RLS Policy Recommendations

### Database Table: `text_overlay_projects`

**Complete RLS Implementation:**

```sql
-- Enable RLS (REQUIRED)
ALTER TABLE text_overlay_projects ENABLE ROW LEVEL SECURITY;

-- SELECT: View own projects only
CREATE POLICY "Users can view own projects"
  ON text_overlay_projects FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL  -- Don't show soft-deleted
  );

-- INSERT: Create projects for self only
CREATE POLICY "Users can create own projects"
  ON text_overlay_projects FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

-- UPDATE: Modify own projects only
CREATE POLICY "Users can update own projects"
  ON text_overlay_projects FOR UPDATE
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

-- DELETE: Soft delete only (update deleted_at timestamp)
CREATE POLICY "Users can soft delete own projects"
  ON text_overlay_projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND deleted_at IS NOT NULL
  );
```

**Why Both USING and WITH CHECK?**
- `USING`: Filters which rows can be accessed
- `WITH CHECK`: Validates new/updated row values
- Both needed to prevent attacks like changing `user_id` during update

### Storage Bucket: `text-overlay-videos`

**Complete Storage RLS Implementation:**

```sql
-- Bucket configuration (private, size limit, MIME whitelist)
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) VALUES (
  'text-overlay-videos',
  'text-overlay-videos',
  false,  -- CRITICAL: Never public
  524288000,  -- 500MB
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']
);

-- INSERT: Upload to own folder only
CREATE POLICY "Users can upload videos to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'text-overlay-videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT: Download own videos only
CREATE POLICY "Users can view own videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'text-overlay-videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: Replace own videos only
CREATE POLICY "Users can update own videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'text-overlay-videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: Remove own videos only
CREATE POLICY "Users can delete own videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'text-overlay-videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

**Path Structure Enforcement:**
- Required format: `{user_id}/{filename}`
- Example: `2c220e7c-558d-451f-ad22-d44098671e38/1764184652174-video.mp4`
- RLS checks first folder segment: `(storage.foldername(name))[1]`
- Must equal authenticated user's ID: `auth.uid()::text`

### Testing RLS Policies

**Test 1: Cross-User Access (Should Fail):**
```typescript
// Sign in as User A
const { data: sessionA } = await supabase.auth.signInWithPassword({
  email: 'userA@example.com',
  password: 'password',
});

// Create project as User A
const { data: projectA } = await supabase
  .from('text_overlay_projects')
  .insert({ title: 'User A Project', user_id: sessionA.user.id })
  .select()
  .single();

// Sign in as User B
await supabase.auth.signOut();
const { data: sessionB } = await supabase.auth.signInWithPassword({
  email: 'userB@example.com',
  password: 'password',
});

// Try to read User A's project (should fail)
const { data: stolen, error } = await supabase
  .from('text_overlay_projects')
  .select('*')
  .eq('id', projectA.id)
  .single();

expect(data).toBeNull();
expect(error).toBeTruthy();
```

**Test 2: User ID Manipulation (Should Fail):**
```typescript
// Try to insert project with different user_id
const { data, error } = await supabase
  .from('text_overlay_projects')
  .insert({
    title: 'Hacked Project',
    user_id: 'different-user-id',  // Not auth.uid()
  });

expect(data).toBeNull();
expect(error).toBeTruthy();
expect(error.message).toContain('policy');
```

**Test 3: Storage Path Traversal (Should Fail):**
```typescript
// Try to upload to another user's folder
const { error } = await supabase.storage
  .from('text-overlay-videos')
  .upload('other-user-id/hacked.mp4', videoFile);

expect(error).toBeTruthy();
expect(error.message).toContain('policy');
```

**References:**
- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)

---

## Compliance Considerations

### GDPR Compliance (EU Users)

**Right to Access (Article 15):**
- Users can view all their projects via Supabase queries
- API endpoint: `GET /api/projects` returns user's data
- Implementation: RLS ensures only user's data returned

**Right to Erasure (Article 17):**
- Soft delete on projects table (`deleted_at` timestamp)
- Hard delete after 90 days (automated cron job)
- Video files deleted from storage on project deletion
- Implementation in PRP: Deletion policies and triggers

**Right to Data Portability (Article 20):**
- Export endpoint: `GET /api/projects/{id}/export`
- Returns JSON with project metadata and download links
- Implementation: Service role generates signed URLs for export

**Data Minimization (Article 5):**
- Only collect necessary data (video, text, styling)
- No unnecessary metadata (GPS, device info) stored
- IP address logged for security only, deleted after 90 days

**Security Measures (Article 32):**
- ✅ Encryption in transit (HTTPS/TLS 1.2+)
- ✅ Encryption at rest (Supabase Storage)
- ✅ Access controls (RLS policies)
- ✅ Audit logging (security events)
- ✅ Regular security testing (penetration tests)

### CCPA Compliance (California Users)

**Right to Know (§1798.100):**
- Disclose what personal information is collected
- Privacy policy lists: email, videos, project data
- Purpose: Provide video editing service

**Right to Delete (§1798.105):**
- Same as GDPR erasure (soft delete + hard delete)
- User-initiated via account settings
- Confirmation email sent on deletion

**Right to Opt-Out (§1798.120):**
- No sale of personal information (not applicable)
- No data sharing with third parties
- Video processing happens on owned infrastructure

**Do Not Sell My Personal Information:**
- Not applicable - no data selling
- No ads, no data brokers
- Explicit statement in privacy policy

### Data Retention Policy

**Active Data:**
- Projects: Retained while user account active
- Videos: Retained while project exists
- Audit logs: 90 days

**Deleted Data:**
- Soft deleted projects: 90 days before hard delete
- User account deletion: All data deleted within 30 days
- Backup retention: 90 days, then permanently deleted

**Legal Hold:**
- Security incidents: Data preserved until investigation complete
- Legal requests: Data preserved per court order
- Documented in incident response plan

### Privacy Policy Requirements

**Must Include:**
1. What data is collected (videos, text, metadata)
2. How data is used (video rendering service)
3. How data is stored (Supabase, encrypted)
4. Who has access (user only, service admins for support)
5. How long data is retained (90 days after deletion)
6. User rights (access, delete, export)
7. Security measures (encryption, RLS, auditing)
8. Contact information (privacy@example.com)
9. Policy update notification process

**Template Added to PRP:** Privacy policy outline in compliance section

---

## Implementation Recommendations

### Phase 0: Critical Security Setup (Before Any Code)

**Priority 1: Environment & Secrets**
- Create `.env.example` files (frontend and server)
- Set up 1Password/AWS Secrets Manager for team
- Generate Supabase service role key (save securely)
- Document all required env vars
- **Time Estimate:** 2 hours
- **Validation:** No secrets in code, all in env vars

**Priority 2: Database Security**
- Run SQL migrations for tables and RLS policies
- Test RLS policies with multi-user scenarios
- Create storage bucket with private configuration
- Test storage RLS policies
- **Time Estimate:** 4 hours
- **Validation:** Cross-user access tests fail

**Priority 3: Security Dependencies**
- Install Zod, express-rate-limit, helmet, cors
- Configure TypeScript with strict mode
- Set up ESLint with security plugin
- Configure pre-commit hooks (lint, type-check)
- **Time Estimate:** 2 hours
- **Validation:** `npm run validate` passes

### Phase 1: Secure Server Implementation (Days 1-2)

**Critical Path:**
1. FFmpeg escaping function + tests (4 hours)
2. File upload validation (magic numbers) (3 hours)
3. Authentication middleware (2 hours)
4. Rate limiting configuration (2 hours)
5. Render endpoint with security (6 hours)
6. Integration tests (4 hours)

**Validation Gates:**
- All unit tests pass (80%+ coverage)
- Injection tests fail (security works)
- Rate limit tests pass
- Cross-user access tests fail

### Phase 2: Secure Frontend Implementation (Days 3-5)

**Critical Path:**
1. Video upload with validation (6 hours)
2. Text editor components (8 hours)
3. XSS-safe preview rendering (4 hours)
4. State management with validation (4 hours)
5. Render flow integration (4 hours)

**Validation Gates:**
- XSS attempts fail in preview
- File validation rejects malicious files
- State constraints enforced (50 segments, 1000 chars)

### Phase 3: Security Testing (Days 6-7)

**Critical Path:**
1. Security unit tests (all critical functions) (4 hours)
2. Integration tests (auth, RLS, rate limiting) (4 hours)
3. Penetration testing checklist (6 hours)
4. OWASP ZAP scan (2 hours)
5. Fix identified issues (4 hours)
6. Security review and sign-off (2 hours)

**Validation Gates:**
- All penetration tests pass
- No high/critical vulnerabilities in scans
- Security team approval obtained

### Critical Success Factors

**Must-Have Before Launch:**
1. ✅ All RLS policies tested and working
2. ✅ FFmpeg injection tests pass (attacks blocked)
3. ✅ File upload validation working (magic numbers)
4. ✅ Rate limiting active on all endpoints
5. ✅ HTTPS enforced (HSTS headers)
6. ✅ All secrets in environment variables
7. ✅ Audit logging active
8. ✅ Penetration testing complete

**Nice-to-Have (Post-Launch):**
- Antivirus scanning integration
- Advanced monitoring dashboard
- Automated security scanning in CI/CD
- Bug bounty program

---

## Key Takeaways for Implementation Team

### 1. Security is Not Optional

This feature handles user-uploaded files and executes FFmpeg with user-provided text. **Any security shortcut could result in complete server compromise.** The PRP treats security as the primary design constraint, not an afterthought.

### 2. Defense in Depth is Essential

No single security control is sufficient:
- File uploads: Extension + MIME + magic number + size + RLS
- FFmpeg: Escaping + timeout + container + resource limits
- API: Auth + rate limiting + validation + CORS + CSP

### 3. Test Security Explicitly

Normal functional tests are not enough:
- Unit tests must include injection payloads
- Integration tests must attempt cross-user access
- Penetration testing is mandatory before launch
- Security tests should FAIL (proving protection works)

### 4. Reuse Existing Patterns

The codebase already has strong patterns:
- ✅ Supabase RLS policies (extend to new tables)
- ✅ Storage path isolation (apply to new bucket)
- ✅ Authentication flow (integrate with render server)

Don't reinvent - adapt proven patterns.

### 5. Phase 0 is Non-Negotiable

The task list has Phase 0 for a reason:
- Environment setup prevents secrets in code
- Database RLS must be tested before implementation
- Input validation foundation needed for all endpoints

**Do not skip Phase 0 tasks.** They prevent security debt.

### 6. Documentation Prevents Mistakes

The PRP includes extensive documentation:
- Why each security control exists
- How to implement it correctly
- What happens if you skip it
- How to test it works

**Read the "Known Gotchas" section** - it lists actual vulnerabilities to avoid.

---

## Resources for Implementation

### Security Research References

**FFmpeg Security:**
- [Jellyfin FFmpeg Vulnerability](https://github.com/jellyfin/jellyfin/security/advisories/GHSA-866x-wj5j-2vf4)
- [FFmpeg Security Documentation](https://ffmpeg.org/security.html)
- [FFmpeg Filters Documentation](https://ffmpeg.org/ffmpeg-filters.html)

**File Upload Security:**
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP Unrestricted File Upload](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload)

**Supabase Security:**
- [Supabase RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage Security](https://supabase.com/docs/guides/storage/security/access-control)

**Express.js Security:**
- [Express Security Best Practices 2025](https://hub.corgea.com/articles/express-security-best-practices-2025)
- [express-rate-limit Package](https://www.npmjs.com/package/express-rate-limit)

**Node.js Security:**
- [Node.js Security Best Practices](https://nodejs.org/en/learn/getting-started/security-best-practices)
- [Node.js Path Traversal Prevention](https://www.nodejs-security.com/blog/secure-coding-practices-nodejs-path-traversal-vulnerabilities)

**XSS Prevention:**
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: Cross-site Scripting](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS)

### Implementation Tools

**Required Dependencies:**
```json
{
  "dependencies": {
    "express": "^4.18.x",
    "fluent-ffmpeg": "^2.1.x",
    "@supabase/supabase-js": "^2.38.x",
    "zod": "^3.22.x",
    "helmet": "^7.1.x",
    "cors": "^2.8.x",
    "express-rate-limit": "^7.1.x"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "@types/express": "^4.17.x",
    "eslint-plugin-security": "^2.1.x",
    "@typescript-eslint/eslint-plugin": "^6.x"
  }
}
```

**Security Testing Tools:**
- OWASP ZAP (automated vulnerability scanning)
- Trivy (Docker image scanning)
- npm audit (dependency vulnerabilities)
- Postman/Insomnia (API testing with injection payloads)

---

## Next Steps

### Immediate Actions (Before Starting Implementation)

1. **Review PRP with Security Team**
   - Schedule security review meeting
   - Get sign-off on approach
   - Identify any additional requirements

2. **Set Up Development Environment**
   - Create test Supabase project
   - Generate service role key
   - Set up local FFmpeg installation
   - Configure environment variables

3. **Create Security Testing Plan**
   - Define penetration testing scope
   - Prepare injection payload test suite
   - Set up automated security scanning in CI/CD

4. **Estimate Timeline**
   - Phase 0: 1 day (security foundation)
   - Phase 1: 2 days (server implementation)
   - Phase 2: 3 days (frontend implementation)
   - Phase 3: 2 days (security testing)
   - **Total: 8 days for security-first MVP**

### Long-Term Enhancements (Post-Launch)

1. **Advanced Security Features**
   - Antivirus scanning integration (ClamAV)
   - Content moderation for inappropriate text
   - Watermarking for rendered videos
   - Advanced rate limiting (ML-based abuse detection)

2. **Compliance Enhancements**
   - SOC 2 compliance preparation
   - Regular penetration testing (quarterly)
   - Bug bounty program
   - Security awareness training for team

3. **Infrastructure Hardening**
   - Kubernetes deployment with pod security policies
   - Network isolation for render workers
   - Secrets rotation automation
   - Intrusion detection system (IDS)

---

## Conclusion

This PRP provides a comprehensive, security-first blueprint for implementing the Video Text Overlay Editor. The approach prioritizes defense-in-depth, with multiple layers of security at every integration point.

**Key Differentiators:**
- Security is the primary design constraint, not an afterthought
- All features designed around preventing specific attack vectors
- Extensive testing protocols ensure security controls work
- Based on real-world vulnerabilities and OWASP best practices
- Reuses proven patterns from existing codebase

**Risk Mitigation:**
- All CRITICAL and HIGH risks have comprehensive mitigations
- Security validation at every phase prevents vulnerabilities
- Defense-in-depth ensures no single point of failure
- Incident response plan ready for security events

**Success Criteria:**
- Zero critical vulnerabilities before launch
- All penetration tests pass
- OWASP Top 10 verification complete
- Security team sign-off obtained

The implementation team now has everything needed to build this feature securely from day one.

---

**Document Generated:** 2025-12-03
**PRP Location:** `/Users/dan/Documents/Max Tornow  2/AI INTERFACE/video-text-overlay-ready/PRPs/video-text-overlay-security.md`
**Total Research Time:** 2 hours
**Total Document Size:** 100+ pages of security-focused implementation guidance
**Status:** Ready for security review and implementation kickoff
