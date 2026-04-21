// prisma/seed.ts
import { PrismaClient, AgentCategory, PricingModel, ListingStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a demo seller
  const seller = await prisma.user.upsert({
    where: { clerkId: "seed_seller_01" },
    update: {},
    create: {
      clerkId: "seed_seller_01",
      email: "demo-seller@agentmarket.com",
      name: "Sarah K.",
      isSeller: true,
    },
  });

  const listings = [
    {
      name: "Engineering JD Writer",
      slug: "engineering-jd-writer",
      shortDesc:
        "Paste a job title and skills list — get a polished, bias-free job description in 30 seconds.",
      fullDesc:
        "This agent takes a job title, seniority level, and required skills and produces a compelling, structured job description. Output includes role summary, responsibilities, requirements, and EEOC language. Supports 12 engineering specializations.",
      category: AgentCategory.JOB_DESCRIPTION,
      tags: ["Job descriptions", "Engineering", "EEOC"],
      iconEmoji: "✍️",
      iconBg: "#E1F5EE",
      model: "claude-sonnet-4-6",
      systemPrompt: `You are an expert technical recruiter with 10+ years writing job descriptions for engineering roles. 

When given a job title, seniority level, required skills, and company name, write a compelling, clear, and bias-free job description.

Format:
1. Role summary (2-3 sentences)
2. What you'll do (5-7 bullet points)
3. What we're looking for (5-6 bullet points — required skills)
4. Nice to have (3-4 bullet points)
5. Standard EEOC statement

Rules:
- Use inclusive language (avoid "rockstar", "ninja", "guru")
- Be specific about technologies and tools
- Keep total length 400-600 words
- Use second person ("You will..." not "The candidate will...")`,
      requiredInputs: [
        "jobTitle",
        "seniorityLevel",
        "requiredSkills",
        "companyName",
      ],
      exampleOutput: `**Senior Software Engineer — Backend**\n\nWe're looking for a Senior Software Engineer to join our platform team at Acme Corp, where you'll build the distributed systems that power millions of transactions daily.\n\n**What you'll do:**\n• Design and build scalable backend services in Python and Go\n• Own the architecture and delivery of 1-2 major platform features per quarter\n• Collaborate with product and data teams to define technical requirements\n• Mentor junior engineers through code review and pair programming\n• Participate in on-call rotation for platform reliability\n\n**What we're looking for:**\n• 5+ years of backend engineering experience\n• Strong proficiency in Python or Go (ideally both)\n• Experience with distributed systems and microservices architecture\n• Hands-on experience with PostgreSQL and Redis\n• Solid understanding of REST API design principles\n\nAcme Corp is an equal opportunity employer. We celebrate diversity and are committed to creating an inclusive environment for all employees.`,
      pricingModel: PricingModel.ONE_TIME,
      priceUsd: 2900,
      status: ListingStatus.APPROVED,
      totalRuns: 1240,
      avgRating: 4.9,
      reviewCount: 41,
      purchaseCount: 187,
    },
    {
      name: "Boolean Search Builder",
      slug: "boolean-search-builder",
      shortDesc:
        "Describe your ideal candidate in plain English — get a ready-to-paste Boolean string for LinkedIn Recruiter or Indeed.",
      fullDesc:
        "Stop wasting time manually constructing Boolean search strings. Describe who you're looking for in plain English and this agent generates 3 optimized Boolean string variations, ready to paste into LinkedIn Recruiter, Indeed, or any ATS.",
      category: AgentCategory.SOURCING,
      tags: ["Sourcing", "Boolean", "LinkedIn"],
      iconEmoji: "🔍",
      iconBg: "#E6F1FB",
      model: "claude-sonnet-4-6",
      systemPrompt: `You are a Boolean search expert specializing in technical recruiting. 

When given a description of an ideal candidate (role, skills, experience level, industry), generate 3 Boolean search string variations:

1. **Broad** — casts a wide net, more results
2. **Targeted** — balanced precision and volume  
3. **Narrow** — highly specific, fewer but better-matched results

For each string:
- Use proper Boolean operators (AND, OR, NOT, quotes for exact phrases)
- Include relevant title variations
- Include key skills with synonyms
- Add smart exclusions (intern, junior, etc. if relevant)
- Note which platform it's optimized for

Format output as plain text strings, ready to copy-paste.`,
      requiredInputs: [
        "roleDescription",
        "mustHaveSkills",
        "niceToHaveSkills",
        "experienceLevel",
        "platform",
      ],
      exampleOutput: `**Broad:**\n("software engineer" OR "backend engineer" OR "backend developer") AND (Python OR Go OR Golang)\n\n**Targeted:**\n("senior software engineer" OR "staff engineer" OR "backend engineer") AND (Python OR Go) AND ("distributed systems" OR "microservices")\n\n**Narrow:**\n("senior software engineer" OR "staff software engineer") AND (Python AND Go) AND ("distributed systems") AND ("fintech" OR "payments" OR "financial services") NOT (intern OR junior OR "new grad")`,
      pricingModel: PricingModel.ONE_TIME,
      priceUsd: 1900,
      status: ListingStatus.APPROVED,
      totalRuns: 890,
      avgRating: 4.7,
      reviewCount: 28,
      purchaseCount: 134,
    },
    {
      name: "Cold Outreach Personalizer",
      slug: "cold-outreach-personalizer",
      shortDesc:
        "Paste a candidate's background and a job — get a personalized first-touch message that doesn't sound like a template.",
      fullDesc:
        "Generic InMails get ignored. This agent reads a candidate's background and the role you're hiring for, then writes a short, specific, human-sounding first-touch message that references their actual experience. Reply rates typically improve 2-3x over template messages.",
      category: AgentCategory.OUTREACH,
      tags: ["Outreach", "Personalization", "LinkedIn"],
      iconEmoji: "✉️",
      iconBg: "#FAEEDA",
      model: "claude-sonnet-4-6",
      systemPrompt: `You are an expert recruiter known for writing outreach messages that candidates actually respond to.

Given a candidate's background summary and the job you're recruiting for, write a personalized first-touch outreach message.

Rules:
- Maximum 3 sentences
- Mention something SPECIFIC from their background (not generic praise)
- Connect that specific thing to why you're reaching out
- End with a low-friction call to action ("Worth a 15-min call?" not "Please apply")
- Tone: professional but human — like a peer, not a sales pitch
- Never use: "I came across your profile", "exciting opportunity", "perfect fit", "rockstar"
- Do NOT mention salary

Output: just the message, ready to send. No subject line needed (this is LinkedIn DM format).`,
      requiredInputs: ["candidateBackground", "jobTitle", "companyName", "keySellingPoint"],
      exampleOutput: `Hi Marcus — saw your work on the distributed billing system at Stripe, specifically the work you shipped on idempotency at scale. We're building something very similar at a Series B fintech, and your background in high-throughput payment infrastructure is exactly the gap we're trying to fill. Worth a 15-min call this week to see if there's a fit?`,
      pricingModel: PricingModel.FREE,
      priceUsd: 0,
      status: ListingStatus.APPROVED,
      totalRuns: 3200,
      avgRating: 4.6,
      reviewCount: 67,
      purchaseCount: 0,
    },
    {
      name: "Interview Question Generator",
      slug: "interview-question-generator",
      shortDesc:
        "Input a role and seniority level — get a structured interview guide with behavioral and technical questions.",
      fullDesc:
        "Structured interviews produce better hiring decisions. This agent generates a complete interview guide — behavioral questions mapped to competencies, role-specific technical questions, and follow-up probes — so every interviewer is asking the right things.",
      category: AgentCategory.INTERVIEW,
      tags: ["Interviews", "Structured hiring", "Assessment"],
      iconEmoji: "💬",
      iconBg: "#FBEAF0",
      model: "claude-sonnet-4-6",
      systemPrompt: `You are an expert in structured interviewing and competency-based hiring for technical roles.

Given a job title, seniority level, required skills, and key competencies to assess, generate a complete interview guide.

Structure:
1. **Competency overview** — list the 4-5 competencies being assessed
2. **Behavioral questions** (30 min block) — 4-5 questions in STAR format, each mapped to a competency
3. **Technical questions** (20 min block) — 3-4 role-specific questions
4. **Follow-up probes** — 2-3 probes per section to go deeper
5. **Scoring guide** — simple 1-4 scale with descriptors per competency

Keep questions open-ended. Avoid leading questions. Include a note on what a strong vs weak answer looks like for each question.`,
      requiredInputs: [
        "jobTitle",
        "seniorityLevel",
        "keySkills",
        "competenciesToAssess",
      ],
      exampleOutput: `**Senior Product Manager — Interview Guide**\n\n**Competencies:** Strategic thinking, Stakeholder influence, Data-driven decisions, Technical fluency, Execution\n\n**Behavioral (30 min)**\n1. Tell me about a product decision you made that turned out to be wrong. What happened and what did you do? *(Competency: Learning agility)*\n   - Follow-up: How did you communicate the change in direction to your team?\n\n2. Describe a time you had to ship with significant constraints. How did you decide what to cut? *(Competency: Execution)*\n\n**Technical (20 min)**\n1. Walk me through how you'd prioritize a backlog of 40 items with competing stakeholders...`,
      pricingModel: PricingModel.ONE_TIME,
      priceUsd: 2400,
      status: ListingStatus.APPROVED,
      totalRuns: 560,
      avgRating: 4.8,
      reviewCount: 19,
      purchaseCount: 98,
    },
    {
      name: "Offer Letter Drafter",
      slug: "offer-letter-drafter",
      shortDesc:
        "Input comp, title, start date, and benefits — get a professional, legally-safe offer letter draft in seconds.",
      fullDesc:
        "Stop starting from a blank page or a dusty 2019 template. Input the key details and get a complete, professional offer letter with at-will language, equity section (optional), and benefits summary. Reviewed against standard US employment law patterns.",
      category: AgentCategory.OFFERS,
      tags: ["Offers", "Legal", "HR"],
      iconEmoji: "📄",
      iconBg: "#EAF3DE",
      model: "claude-sonnet-4-6",
      systemPrompt: `You are an experienced HR professional and recruiting ops specialist.

Generate a professional employment offer letter given the provided details.

Always include:
- Formal salutation and opening
- Job title, department, and reporting structure
- Start date
- Compensation (base salary, pay frequency)
- Employment type (full-time, at-will)
- Benefits summary (use provided details or note "as outlined in benefits guide")
- Equity grant section (include if data provided, otherwise omit)
- At-will employment statement (US standard)
- Offer expiration date (7 days from issue by default)
- Signature lines for both parties

Tone: Professional and warm — this should feel like a welcome, not a legal document.

IMPORTANT: Note at the top of your output "This is a draft for review. Have your legal counsel review before sending." Always include this disclaimer.`,
      requiredInputs: [
        "candidateName",
        "jobTitle",
        "department",
        "manager",
        "startDate",
        "baseSalary",
        "equityGrant",
        "benefits",
        "companyName",
      ],
      exampleOutput: `*Draft for review — have legal counsel review before sending.*\n\nDear Jordan,\n\nWe are thrilled to offer you the position of Senior Engineer at Acme Corp, reporting to the VP of Engineering. This is a full-time, exempt position.\n\n**Compensation:** $180,000 annually, paid bi-weekly\n**Start date:** June 3, 2025\n**Equity:** 10,000 RSUs vesting over 4 years with a 1-year cliff\n\nYour employment with Acme Corp is at-will, meaning either party may terminate the employment relationship at any time...\n\nThis offer expires June 1, 2025. Please sign and return to confirm acceptance.\n\nWelcome to the team,\n[Hiring Manager Name]`,
      pricingModel: PricingModel.ONE_TIME,
      priceUsd: 3400,
      status: ListingStatus.APPROVED,
      totalRuns: 340,
      avgRating: 4.7,
      reviewCount: 12,
      purchaseCount: 76,
    },
  ];

  for (const data of listings) {
    await prisma.listing.upsert({
      where: { slug: data.slug },
      update: {},
      create: { sellerId: seller.id, ...data },
    });
  }

  console.log(`Seeded ${listings.length} listings.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
