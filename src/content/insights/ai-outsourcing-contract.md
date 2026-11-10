---
title: "The AI in your outsourcing contract"
description: "From 10 December, regulated entities must disclose automated decisions that affect customers, including those made by their outsourcing partners."
slug: ai-outsourcing-contract
topic: ai-governance
author: philip-hyde
publishDate: 2026-11-10
draft: false
---

## A disclosure that follows the process

On 10 December 2026 a new Privacy Act obligation starts. An organisation’s privacy policy must describe the kinds of decisions it has arranged for a computer program to make, or substantially assist, where those decisions use personal information and could significantly affect a person’s rights or interests. Loan approvals and insurance eligibility are among the examples commentators draw from the regulator’s guidance.

The guidance the OAIC published on 30 September deals with outsourcing. As law firms have reported it, the obligation stays with the entity responsible for setting up or organising the program, even where a third party operates the technology. Putting a human reviewer between the output and the outcome does not take a decision out of scope either.

For a bank, insurer or super fund that has moved claims, collections, onboarding or hardship processing to an outsourcing partner, the consequence is direct. If the partner has automated a decision step inside that process, the entity has to know about it and disclose it. Many will not be able to answer that question from their own records.

## Most AI arrives through someone else

Regulators have already measured this. ASIC’s 2024 review of 624 AI use cases at 23 licensees found that 30% used models developed by third parties. At 13 of the 23 licensees, third parties had built half or more of the models, and at four they had built all of them. One licensee could not say what technique some of its third-party models used.

APRA’s letter to industry on 30 April 2026 described the same pattern from the prudential side. It noted that AI capabilities are increasingly embedded in software and platforms, that “contractual arrangements often lagged practice”, and that entities showed “an overreliance on vendor presentations and summaries”. It also observed that upstream dependencies, including foundation models and fourth-party providers, are opaque.

AI governance in most regulated entities was built around what the entity itself develops or buys through technology change. It catches a model the data science team deploys. It tends to miss a model a partner switches on inside a process the entity outsourced three years ago.

## Five roles, one accountable owner

A single AI use case can involve up to five parties. Take a hardship assessment, as an illustration: an offshore operator runs the process, on a workflow platform configured by a technology partner, calling a model from a global provider, with the data held in a cloud region chosen by someone else.

| Role | What it does | Typically |
| --- | --- | --- |
| Provider | Supplies the model, AI service or platform | Hyperscalers, model and software vendors |
| Builder | Designs, configures, tests and changes the solution | Technology services partners, internal teams |
| Operator | Uses the AI output to run the process and serve customers | Outsourcing partners, internal operations |
| Data host | Holds the data the AI consumes or produces | Cloud and platform providers |
| Accountable owner | Owns the outcome, the risk and the regulatory obligations | The regulated entity |

Four of those roles can be contracted out. The fifth cannot. APRA expects “ownership and accountability across the AI lifecycle”, and ASIC’s report states that licensees remain responsible for outsourced functions.

## Where it falls between contracts

Each partner is usually governed under its own agreement, by its own relationship manager, through its own service review. The gaps appear where a use case crosses from one agreement to the next.

1. **Ownership.** Accountability maps follow functions and contracts. A use case spanning three partners often has no single named owner inside the entity.
2. **Change.** Providers update models on their own release cycle, and an operator’s change process may not treat a model update as a change at all. ASIC found one licensee whose vendor had recalibrated a model with no documentation of the effect.
3. **Assurance.** Assurance reports cover one provider each. Nobody reports on the chain, and receiving a report is a weaker thing than overseeing a process.
4. **Disclosure.** The 10 December obligation needs a list of automated decisions by process. Partner-operated decisions sit outside most inventories being built for it.
5. **Concentration.** Several partners commonly rely on the same few model and cloud providers. ASIC and APRA warned in August that shared dependencies can turn one incident into a sector-wide disruption.

## The contract may already have approved it

There is a commercial reason this gap exists. In our experience, outsourcing agreements usually commit the provider to productivity improvements or price reductions year on year, and automation is how providers meet them. The entity agreed to the outcome when it signed. It rarely agreed to a process for being told how the outcome would be delivered.

Agreements signed before generative AI was in common use are the most exposed. Their change control clauses were written for system releases and process redesign. A partner that introduces an AI step to triage, classify or recommend may be acting entirely within the contract while changing what the entity has to disclose and oversee.

The same issue appears in separations. Under a TSA the seller’s systems, including any models in them, keep making decisions about customers who now belong to the buyer. The buyer carries the disclosure and oversight obligations from day one, with less visibility than it will ever have again.

## What to do before 10 December, and after

None of this needs a separate AI framework. It needs the existing risk, outsourcing and accountability arrangements extended to cover AI that partners introduce.

- Ask each operating partner, in writing, which steps in your processes use a computer program to make or inform a decision about a customer. Ask what personal information each uses and whether a person can override it.
- Name one accountable person for each material use case. Assign by use case, because assigning by contract leaves the cross-partner cases unowned.
- Create one approval route for new AI and material change that applies whoever initiates it, including a provider’s model update.
- Add minimum terms to each agreement through its change process: notification of AI use, model change, data location, use of your data for training, human review, audit rights and flow-down to subcontractors.
- Decide what you will test directly. APRA has said that vendor summaries are being relied on too heavily.

## What is not yet settled

The OAIC’s guidance is not binding, and its reach into outsourced processes will be tested in practice. The Prime Minister announced mandatory Australian Standards for AI in July 2026, with legislation due in early 2027, and what they will require of organisations that deploy AI has not been defined. An entity that already knows where AI sits across its partners, and who answers for it, will be able to absorb either development. One that does not will be starting from an inventory.

## Sources

- [OAIC, New resources on transparency for use of AI and automated decision-making, 30 September 2026](https://www.oaic.gov.au/news/media-centre/new-resources-on-transparency-for-use-of-ai-and-automated-decision-making)
- [Gilbert + Tobin, Automated decision-making transparency under the Privacy Act](https://www.gtlaw.com.au/insights/automated-decision-making-transparency-under-the-privacy-act)
- [LK Law, AI and automated decision-making: new guidance on the transparency obligation, 6 October 2026](https://www.lk.law/2026/10/ai-automated-decision-making-new-guidance-on-the-transparency-obligation-for-privacy-policies/)
- [Johnson Winter Slattery, ADM disclosure obligations: key takeaways from the OAIC’s guidance material](https://jws.com.au/what-we-think/adm-disclosure-obligations-key-takeaways-from-the-oaics-guidance-material/)
- [ASIC, REP 798 Beware the gap: governance arrangements in the face of AI innovation, October 2024](https://download.asic.gov.au/media/mtllqjo0/rep-798-published-29-october-2024.pdf)
- [APRA, Letter to industry on artificial intelligence, 30 April 2026](https://www.apra.gov.au/news-and-publications/apra-letter-industry-artificial-intelligence-ai)
- [ASIC and APRA, 26-201MR Frontier AI awareness must turn to action, 27 August 2026](https://www.asic.gov.au/about-asic/news-centre/find-a-media-release/2026-releases/26-201mr-asic-and-apra-warn-frontier-ai-awareness-must-turn-to-action)
- [Gadens, Prime Minister announces national AI regulation, 16 July 2026](https://www.gadens.com/insights/prime-minister-announces-national-ai-regulation-key-takeaways-for-investors,-developers-and-operators)
