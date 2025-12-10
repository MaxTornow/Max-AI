# Remotion Pricing & Licensing

## Overview

Remotion uses a dual-license model: free for open source projects, paid for commercial use. Understanding the licensing is critical for building a Submagic clone.

---

## License Types

### Free License (Remotion License v2)

**Eligibility:**
- Open source projects (source code publicly available)
- Personal/educational use
- Evaluation and testing

**Restrictions:**
- Cannot be used in closed-source commercial products
- Must credit Remotion in public-facing materials
- No priority support

### Company License

**Required When:**
- Building closed-source software
- Commercial SaaS products
- Internal company tools
- Client projects

**What You Get:**
- Right to use in commercial projects
- No open source requirement
- Remove Remotion branding
- Priority support options

---

## Pricing Tiers

### Individual/Startup Tier
| Metric | Details |
|--------|---------|
| Team Size | 1-3 developers |
| Annual Cost | ~$200-400/year |
| Renders | Unlimited |
| Support | Community + email |

### Team Tier
| Metric | Details |
|--------|---------|
| Team Size | 4-10 developers |
| Annual Cost | ~$100/seat/month ($4,800-12,000/year) |
| Renders | Unlimited |
| Support | Priority email |

### Enterprise Tier
| Metric | Details |
|--------|---------|
| Team Size | 10+ developers |
| Annual Cost | Custom pricing |
| Renders | Unlimited |
| Support | Dedicated support, SLA |
| Extras | Custom contracts, training |

---

## Lambda Rendering Costs

### AWS Lambda Pricing

**Per-Render Breakdown:**
- 1-minute video: ~$0.05-0.10
- 5-minute video: ~$0.25-0.50
- 30-minute video: ~$1.50-3.00

**Factors Affecting Cost:**
- Video resolution (1080p vs 4K)
- Complexity (effects, transitions)
- Lambda memory allocation
- Region pricing differences

### Monthly Cost Estimates

| Usage Level | Renders/Month | Est. Cost |
|-------------|---------------|-----------|
| Light | 100 videos | $5-10 |
| Medium | 1,000 videos | $50-100 |
| Heavy | 10,000 videos | $500-1,000 |
| Enterprise | 100,000+ videos | $5,000+ |

### Cost Optimization Tips
1. Use chunk rendering for parallelization
2. Optimize composition complexity
3. Cache common assets in S3
4. Use ARM64 Lambda functions (20% cheaper)

---

## Self-Hosted Rendering Costs

### Server Requirements

**Minimum (Light Usage):**
- 4 CPU cores
- 8GB RAM
- 100GB storage
- Est. cost: $40-80/month (DigitalOcean, Render, Railway)

**Recommended (Medium Usage):**
- 8 CPU cores
- 16GB RAM
- 250GB storage
- Est. cost: $100-200/month

**High Volume:**
- 16+ CPU cores
- 32GB+ RAM
- 500GB+ storage
- Est. cost: $300-500/month

### Platform Options
| Platform | Min. Cost | Notes |
|----------|-----------|-------|
| Railway | $5/month | Easy deployment |
| Render | $7/month | Good for Node.js |
| DigitalOcean | $24/month | Reliable, predictable |
| AWS EC2 | $30+/month | Most flexible |
| Google Cloud Run | Pay-per-use | Serverless option |

---

## Total Cost of Ownership

### Year 1 Costs (Submagic Clone)

**Upfront:**
| Item | Cost |
|------|------|
| Editor Starter Kit | $600 |
| Animated Captions | $100 |
| **Subtotal** | **$700** |

**Ongoing (Monthly):**
| Item | Cost |
|------|------|
| Remotion License (1-3 devs) | ~$25/month |
| Lambda rendering (1000 videos) | ~$75/month |
| OpenAI Whisper API | ~$50/month |
| Hosting (frontend) | ~$20/month |
| **Monthly Total** | **~$170/month** |

**Year 1 Total: $700 + ($170 × 12) = $2,740**

### Comparison to Alternatives

| Solution | Year 1 Cost | Render Speed | Features |
|----------|-------------|--------------|----------|
| Remotion | $2,740 | Fast (Lambda) | Full control |
| Custom FFmpeg | $1,500 | Slow | Limited |
| Creatomate | $3,600 | Fast | Less control |
| Shotstack | $6,000+ | Fast | API-only |

---

## License Compliance

### What's Monitored
- Remotion doesn't have telemetry/tracking
- Compliance is trust-based
- Audits possible for enterprise contracts

### License Violations
- Using in commercial product without license
- Exceeding team size without upgrade
- Redistributing Remotion as your own

### Best Practices
1. Purchase license before launch
2. Track team members using Remotion
3. Keep receipts for license purchases
4. Review license terms annually

---

## Getting Started Path

### Phase 1: Evaluation (Free)
- Use free license for development
- Test all features
- Build prototype

### Phase 2: MVP Launch (~$100/month)
- Purchase individual license
- Start with self-hosted rendering
- Minimal Lambda usage

### Phase 3: Scale (~$300-500/month)
- Upgrade license if team grows
- Move to Lambda for reliability
- Add OpenAI costs for transcription

### Phase 4: Growth (~$1,000+/month)
- Enterprise license if needed
- Dedicated rendering infrastructure
- Support SLA

---

## Discount Opportunities

### Available Discounts
- **Startups**: Apply for startup program
- **Open Source**: Free license
- **Education**: Free for students/teachers
- **Non-profit**: Reduced rates available

### How to Apply
- Contact sales@remotion.dev
- Explain use case and budget
- Provide company details

---

## Key Takeaways

1. **License Cost**: Relatively low (~$25-100/month depending on team size)
2. **Rendering Cost**: Main variable cost (Lambda or self-hosted)
3. **Store Products**: One-time purchases, good ROI
4. **Total Year 1**: ~$2,000-3,500 for a Submagic-like product
5. **Scales Well**: Costs grow linearly with usage

---

*Research compiled December 2025*
