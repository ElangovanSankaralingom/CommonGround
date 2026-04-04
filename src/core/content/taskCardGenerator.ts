/**
 * taskCardGenerator.ts — Generates role-specific task cards based on vision board features.
 * Used in Phase 4 to provide contextual action/method/who/outcome options per role × task type.
 */

// ─── Types ───────────────────────────────────────────────────────

export interface TaskCard {
  id: string;
  text: string;
  detail: string;
  category: 'action' | 'method' | 'who' | 'outcome';
  role: string;
  taskType: string;
  featureRef?: string;
  clueRef?: string;
  layer?: 'foundation' | 'activation' | 'sustainability';
}

export interface GeneratedCards {
  actionCards: TaskCard[];
  methodCards: Record<string, TaskCard[]>;
  whoCards: TaskCard[];
  outcomeCards: TaskCard[];
}

// ─── Template structure ──────────────────────────────────────────

interface RoleTaskTemplates {
  actions: string[];
  methods: string[];
  whoOptions: string[];
  outcomes: string[];
}

// ─── Role Templates ──────────────────────────────────────────────

const ROLE_TEMPLATES: Record<string, Record<string, RoleTaskTemplates>> = {
  administrator: {
    assess: {
      actions: ['Audit [feature1] implementation status', 'Verify budget allocation for [feature2]', 'Order interdepartmental assessment of [zoneName]', 'Review contractor compliance for [zoneName]'],
      methods: ['Request Corporation accounts department records', 'Use investigation data as reference baseline', 'Consult Ward councillor office for [zoneName]'],
      whoOptions: ['Corporation supervisor — institutional authority', 'Ward councillor office — political channel', 'Parks Commissioner — approval authority', 'Revenue department — land and budget records'],
      outcomes: ['Budget trail documented with responsible officers', 'Status report with gap analysis completed', 'Institutional bottlenecks identified'],
    },
    plan: {
      actions: ['Create implementation timeline for [feature1]', 'Draft Corporation budget proposal for [feature1]', 'Design approval workflow for [zoneName]', 'Establish stakeholder coordination mechanism'],
      methods: ['Request Corporation accounts department records', 'Use investigation data as reference baseline', 'Consult Ward councillor office for [zoneName]'],
      whoOptions: ['Corporation supervisor — institutional authority', 'Ward councillor office — political channel', 'Parks Commissioner — approval authority', 'Revenue department — land and budget records'],
      outcomes: ['Approved implementation plan with timeline', 'Budget proposal submitted to Commissioner', 'Coordination mechanism activated'],
    },
    design: {
      actions: ['Design administrative process for [feature1]', 'Create staff deployment plan for [zoneName]', 'Design interdepartmental workflow', 'Layout phased implementation zones'],
      methods: ['Request Corporation accounts department records', 'Use investigation data as reference baseline', 'Consult Ward councillor office for [zoneName]'],
      whoOptions: ['Corporation supervisor — institutional authority', 'Ward councillor office — political channel', 'Parks Commissioner — approval authority', 'Revenue department — land and budget records'],
      outcomes: ['Administrative process documented', 'Staff deployment schedule created', 'Implementation zones approved'],
    },
    build: {
      actions: ['Issue work order for [feature1]', 'Deploy Corporation workforce for [feature1]', 'Authorize material procurement for [feature2]', 'Establish site supervision protocol'],
      methods: ['Request Corporation accounts department records', 'Use investigation data as reference baseline', 'Consult Ward councillor office for [zoneName]'],
      whoOptions: ['Corporation supervisor — institutional authority', 'Ward councillor office — political channel', 'Parks Commissioner — approval authority', 'Revenue department — land and budget records'],
      outcomes: ['Work order issued and acknowledged', 'Construction supervision established', 'Material procurement completed'],
    },
    maintain: {
      actions: ['Establish monthly inspection for [feature1]', 'Create staff maintenance roster', 'Set up Corporation reporting mechanism', 'Design annual maintenance budget line'],
      methods: ['Request Corporation accounts department records', 'Use investigation data as reference baseline', 'Consult Ward councillor office for [zoneName]'],
      whoOptions: ['Corporation supervisor — institutional authority', 'Ward councillor office — political channel', 'Parks Commissioner — approval authority', 'Revenue department — land and budget records'],
      outcomes: ['Monthly inspection schedule operational', 'Maintenance budget line approved', 'Reporting mechanism generating data'],
    },
  },
  designer: {
    assess: {
      actions: ['Survey technical condition of [feature1]', 'Test environmental parameters at [zoneName]', 'Map infrastructure connections in [zoneName]', 'Assess material requirements for [feature2]'],
      methods: ['Use technical instruments and measurement tools', 'Reference investigation data for baseline comparison', 'Walk site with experienced technician for verification'],
      whoOptions: ['PWD engineer — technical expertise', 'TSEDA architecture students — documentation support', 'Structural consultant — specialist assessment', 'Environmental testing lab — analytical services'],
      outcomes: ['Technical condition report with measurements', 'Environmental baseline data collected', 'Infrastructure dependency map documented'],
    },
    plan: {
      actions: ['Create technical restoration plan for [feature1]', 'Develop phased construction schedule', 'Prepare material procurement plan', 'Design quality control checkpoints'],
      methods: ['Use technical instruments and measurement tools', 'Reference investigation data for baseline comparison', 'Walk site with experienced technician for verification'],
      whoOptions: ['PWD engineer — technical expertise', 'TSEDA architecture students — documentation support', 'Structural consultant — specialist assessment', 'Environmental testing lab — analytical services'],
      outcomes: ['Technical plan with specifications ready', 'Construction schedule with milestones', 'Material list with quantities prepared'],
    },
    design: {
      actions: ['Create technical specification for [feature1]', 'Design structural layout for [feature2]', 'Prepare engineering drawings for [zoneName]', 'Design material specification sheet'],
      methods: ['Use technical instruments and measurement tools', 'Reference investigation data for baseline comparison', 'Walk site with experienced technician for verification'],
      whoOptions: ['PWD engineer — technical expertise', 'TSEDA architecture students — documentation support', 'Structural consultant — specialist assessment', 'Environmental testing lab — analytical services'],
      outcomes: ['Engineering drawings completed', 'Technical specification approved', 'Structural design validated'],
    },
    build: {
      actions: ['Execute technical construction of [feature1]', 'Install infrastructure components for [feature2]', 'Build according to specification drawings', 'Construct foundation and structural elements'],
      methods: ['Use technical instruments and measurement tools', 'Reference investigation data for baseline comparison', 'Walk site with experienced technician for verification'],
      whoOptions: ['PWD engineer — technical expertise', 'TSEDA architecture students — documentation support', 'Structural consultant — specialist assessment', 'Environmental testing lab — analytical services'],
      outcomes: ['Construction completed to specification', 'Infrastructure installed and tested', 'Quality standards verified on site'],
    },
    maintain: {
      actions: ['Create technical maintenance protocol for [feature1]', 'Schedule periodic structural inspections', 'Design preventive maintenance checklist', 'Establish quality benchmarks for monitoring'],
      methods: ['Use technical instruments and measurement tools', 'Reference investigation data for baseline comparison', 'Walk site with experienced technician for verification'],
      whoOptions: ['PWD engineer — technical expertise', 'TSEDA architecture students — documentation support', 'Structural consultant — specialist assessment', 'Environmental testing lab — analytical services'],
      outcomes: ['Maintenance protocol operational', 'Inspection schedule producing reports', 'Quality benchmarks being tracked'],
    },
  },
  citizen: {
    assess: {
      actions: ['Interview residents about [feature1] priorities', 'Document daily usage patterns at [zoneName]', 'Collect stories from long-term [zoneName] visitors', 'Map community needs related to [feature2]'],
      methods: ['Walk door-to-door with volunteer assistants', 'Hold evening meeting at community gathering spot', 'Use WhatsApp group for outreach to younger residents'],
      whoOptions: ['Community volunteers — local helpers who know every household', 'Resident association — organized community voice', 'School eco-club — youth engagement', 'Self-help group women — neighbourhood network'],
      outcomes: ['Top 5 community priorities identified and ranked', 'Community volunteer network activated', 'Usage baseline established for impact measurement'],
    },
    plan: {
      actions: ['Organize community participation plan for [feature1]', 'Design volunteer training schedule', 'Create community communication strategy', 'Plan neighbourhood engagement events'],
      methods: ['Walk door-to-door with volunteer assistants', 'Hold evening meeting at community gathering spot', 'Use WhatsApp group for outreach to younger residents'],
      whoOptions: ['Community volunteers — local helpers who know every household', 'Resident association — organized community voice', 'School eco-club — youth engagement', 'Self-help group women — neighbourhood network'],
      outcomes: ['Community participation calendar created', 'Volunteer team trained and ready', 'Communication channels established'],
    },
    design: {
      actions: ['Design community gathering space layout', 'Create inclusive accessibility features for [feature1]', 'Design information and wayfinding system', 'Layout community activity zones in [zoneName]'],
      methods: ['Walk door-to-door with volunteer assistants', 'Hold evening meeting at community gathering spot', 'Use WhatsApp group for outreach to younger residents'],
      whoOptions: ['Community volunteers — local helpers who know every household', 'Resident association — organized community voice', 'School eco-club — youth engagement', 'Self-help group women — neighbourhood network'],
      outcomes: ['Community space layout approved by residents', 'Accessibility features designed with user input', 'Wayfinding system designed'],
    },
    build: {
      actions: ['Organize community construction effort for [feature1]', 'Build community spaces using local skills', 'Install community-designed elements', 'Construct using shramdaan volunteer effort'],
      methods: ['Walk door-to-door with volunteer assistants', 'Hold evening meeting at community gathering spot', 'Use WhatsApp group for outreach to younger residents'],
      whoOptions: ['Community volunteers — local helpers who know every household', 'Resident association — organized community voice', 'School eco-club — youth engagement', 'Self-help group women — neighbourhood network'],
      outcomes: ['Community space built with volunteer labour', 'Local skills utilized in construction', 'Community ownership established through participation'],
    },
    maintain: {
      actions: ['Form community maintenance committee for [zoneName]', 'Organize volunteer cleanup schedule', 'Create neighbourhood watch for [zoneName]', 'Establish community reporting channel'],
      methods: ['Walk door-to-door with volunteer assistants', 'Hold evening meeting at community gathering spot', 'Use WhatsApp group for outreach to younger residents'],
      whoOptions: ['Community volunteers — local helpers who know every household', 'Resident association — organized community voice', 'School eco-club — youth engagement', 'Self-help group women — neighbourhood network'],
      outcomes: ['Maintenance committee operational with monthly meetings', 'Cleanup schedule running weekly', 'Community reporting channel active'],
    },
  },
  advocate: {
    assess: {
      actions: ['File RTI on [feature1] maintenance records', 'Review regulatory compliance for [zoneName]', 'Verify contractor accountability for [zoneName]', 'Audit institutional agreements covering [feature1]'],
      methods: ['File formal RTI application with Corporation', 'Reference regulatory body guidelines and standards', 'Consult legal aid clinic for pro bono opinion'],
      whoOptions: ['TNPCB officer — environmental regulatory authority', 'Legal aid clinic — free legal consultation', 'RTI activist network — information access expertise', 'Consumer forum — public accountability channel'],
      outcomes: ['Regulatory violation documented with evidence', 'Legal pathway identified', 'Environmental compliance status verified'],
    },
    plan: {
      actions: ['Draft policy compliance roadmap for [feature1]', 'Create institutional accountability framework', 'Plan legal documentation sequence', 'Design monitoring and oversight protocol'],
      methods: ['File formal RTI application with Corporation', 'Reference regulatory body guidelines and standards', 'Consult legal aid clinic for pro bono opinion'],
      whoOptions: ['TNPCB officer — environmental regulatory authority', 'Legal aid clinic — free legal consultation', 'RTI activist network — information access expertise', 'Consumer forum — public accountability channel'],
      outcomes: ['Compliance roadmap with deadlines ready', 'Accountability framework approved', 'Legal documentation sequence planned'],
    },
    design: {
      actions: ['Design environmental compliance package for [feature1]', 'Create legal protection framework', 'Design transparency and reporting system', 'Layout accountability checkpoints for [zoneName]'],
      methods: ['File formal RTI application with Corporation', 'Reference regulatory body guidelines and standards', 'Consult legal aid clinic for pro bono opinion'],
      whoOptions: ['TNPCB officer — environmental regulatory authority', 'Legal aid clinic — free legal consultation', 'RTI activist network — information access expertise', 'Consumer forum — public accountability channel'],
      outcomes: ['Compliance package ready for submission', 'Legal framework documented', 'Transparency system designed'],
    },
    build: {
      actions: ['Build documentation and evidence archive', 'Establish compliance monitoring system', 'Construct grievance redressal mechanism', 'Ensure construction meets regulatory standards'],
      methods: ['File formal RTI application with Corporation', 'Reference regulatory body guidelines and standards', 'Consult legal aid clinic for pro bono opinion'],
      whoOptions: ['TNPCB officer — environmental regulatory authority', 'Legal aid clinic — free legal consultation', 'RTI activist network — information access expertise', 'Consumer forum — public accountability channel'],
      outcomes: ['Evidence archive operational', 'Compliance monitoring active', 'Grievance mechanism accessible to public'],
    },
    maintain: {
      actions: ['Set up regulatory compliance monitoring for [feature1]', 'Create public accountability dashboard', 'Establish periodic RTI filing schedule', 'Design whistleblower protection protocol'],
      methods: ['File formal RTI application with Corporation', 'Reference regulatory body guidelines and standards', 'Consult legal aid clinic for pro bono opinion'],
      whoOptions: ['TNPCB officer — environmental regulatory authority', 'Legal aid clinic — free legal consultation', 'RTI activist network — information access expertise', 'Consumer forum — public accountability channel'],
      outcomes: ['Compliance monitoring generating reports', 'Accountability dashboard live', 'RTI schedule producing regular disclosures'],
    },
  },
  investor: {
    assess: {
      actions: ['Estimate revenue potential of [feature1]', 'Survey vendor interest near [zoneName]', 'Benchmark against successful similar projects', 'Calculate cost-benefit ratio for [feature2]'],
      methods: ['Interview existing and potential vendors on site', 'Research comparable municipal facility revenue data', 'Consult with local business association'],
      whoOptions: ['Local vendors — direct revenue stakeholders', 'Bank loan officer — financing options', 'CSR program manager — corporate funding', 'Municipal revenue department — fee structure authority'],
      outcomes: ['Revenue projection with break-even timeline', 'Vendor partnership terms documented', 'Cost-benefit analysis completed'],
    },
    plan: {
      actions: ['Develop financial sustainability model for [feature1]', 'Create revenue generation timeline', 'Plan vendor partnership agreements', 'Design maintenance funding mechanism'],
      methods: ['Interview existing and potential vendors on site', 'Research comparable municipal facility revenue data', 'Consult with local business association'],
      whoOptions: ['Local vendors — direct revenue stakeholders', 'Bank loan officer — financing options', 'CSR program manager — corporate funding', 'Municipal revenue department — fee structure authority'],
      outcomes: ['Financial model with 5-year projection ready', 'Revenue timeline with milestones', 'Partnership agreements drafted'],
    },
    design: {
      actions: ['Design revenue collection system for [feature1]', 'Create vendor stall layout for maximum footfall', 'Design maintenance cost recovery model', 'Layout commercial and public space balance'],
      methods: ['Interview existing and potential vendors on site', 'Research comparable municipal facility revenue data', 'Consult with local business association'],
      whoOptions: ['Local vendors — direct revenue stakeholders', 'Bank loan officer — financing options', 'CSR program manager — corporate funding', 'Municipal revenue department — fee structure authority'],
      outcomes: ['Revenue system designed and costed', 'Vendor layout optimized', 'Cost recovery model validated'],
    },
    build: {
      actions: ['Construct revenue-generating facilities near [feature1]', 'Build vendor infrastructure for income', 'Install paid amenity systems', 'Construct maintenance-funded improvements'],
      methods: ['Interview existing and potential vendors on site', 'Research comparable municipal facility revenue data', 'Consult with local business association'],
      whoOptions: ['Local vendors — direct revenue stakeholders', 'Bank loan officer — financing options', 'CSR program manager — corporate funding', 'Municipal revenue department — fee structure authority'],
      outcomes: ['Revenue facilities operational', 'Vendor infrastructure ready for occupancy', 'Paid amenities installed and tested'],
    },
    maintain: {
      actions: ['Create revenue-funded maintenance model for [feature1]', 'Establish vendor fee collection for upkeep', 'Design financial sustainability audit', 'Build emergency maintenance reserve fund'],
      methods: ['Interview existing and potential vendors on site', 'Research comparable municipal facility revenue data', 'Consult with local business association'],
      whoOptions: ['Local vendors — direct revenue stakeholders', 'Bank loan officer — financing options', 'CSR program manager — corporate funding', 'Municipal revenue department — fee structure authority'],
      outcomes: ['Revenue-funded maintenance operational', 'Fee collection running smoothly', 'Financial audit schedule established'],
    },
  },
};

// ─── Cross-Perspective Benefits ──────────────────────────────────

export const CROSS_PERSPECTIVE_BENEFITS: Record<string, string[]> = {
  administrator: ['Provides budget justification', 'Enables Corporation approval', 'Creates institutional backing', 'Satisfies regulatory requirements'],
  designer: ['Delivers technical data', 'Validates site conditions', 'Informs design specifications', 'Enables construction planning'],
  citizen: ['Addresses community priority', 'Builds public support', 'Creates community ownership', 'Improves daily life quality'],
  advocate: ['Provides compliance evidence', 'Strengthens accountability case', 'Supports policy enforcement', 'Enables legal protection'],
  investor: ['Validates revenue potential', 'Reduces project risk', 'Creates sustainable funding', 'Attracts private partnership'],
};

// ─── Main Generation Function ────────────────────────────────────

function replacePlaceholders(text: string, feature1: string, feature2: string, feature3: string, zoneName: string): string {
  return text
    .replace(/\[feature1\]/g, feature1)
    .replace(/\[feature2\]/g, feature2)
    .replace(/\[feature3\]/g, feature3)
    .replace(/\[zoneName\]/g, zoneName);
}

export function generateTaskCards(
  zoneId: string,
  zoneName: string,
  selectedFeatures: string[],
  taskType: string,
  playerRole: string,
  investigationCluesFound: string[],
): GeneratedCards {
  const feature1 = selectedFeatures[0] || 'primary improvement';
  const feature2 = selectedFeatures[1] || 'secondary improvement';
  const feature3 = selectedFeatures[2] || 'supporting improvement';

  const roleKey = playerRole.toLowerCase();
  const taskKey = taskType.toLowerCase();

  const templates = ROLE_TEMPLATES[roleKey]?.[taskKey];
  if (!templates) {
    console.warn('TASK_CARDS: No templates for', roleKey, taskKey);
    return { actionCards: [], methodCards: {}, whoCards: [], outcomeCards: [] };
  }

  // Action cards
  const actionCards: TaskCard[] = templates.actions.map((tpl, i) => ({
    id: `${zoneId}_${roleKey}_${taskKey}_action_${i}`,
    text: replacePlaceholders(tpl, feature1, feature2, feature3, zoneName),
    detail: '',
    category: 'action' as const,
    role: roleKey,
    taskType: taskKey,
    featureRef: i === 0 ? feature1 : i === 1 ? feature2 : undefined,
  }));

  // Method cards per action
  const methodCards: Record<string, TaskCard[]> = {};
  actionCards.forEach(action => {
    const baseMethods: TaskCard[] = templates.methods.map((m, i) => ({
      id: `${action.id}_method_${i}`,
      text: replacePlaceholders(m, feature1, feature2, feature3, zoneName),
      detail: '',
      category: 'method' as const,
      role: roleKey,
      taskType: taskKey,
    }));

    if (investigationCluesFound.length > 0) {
      baseMethods.push({
        id: `${action.id}_method_clue`,
        text: 'Reference investigation data discovered in Phase 2',
        detail: 'Connect planning to evidence gathered during zone investigation',
        category: 'method' as const,
        role: roleKey,
        taskType: taskKey,
        clueRef: investigationCluesFound[0],
      });
    }

    methodCards[action.id] = baseMethods;
  });

  // WHO cards
  const whoCards: TaskCard[] = templates.whoOptions.map((w, i) => ({
    id: `${zoneId}_${roleKey}_who_${i}`,
    text: w,
    detail: '',
    category: 'who' as const,
    role: roleKey,
    taskType: taskKey,
  }));

  // Outcome cards
  const outcomeCards: TaskCard[] = templates.outcomes.map((o, i) => ({
    id: `${zoneId}_${roleKey}_${taskKey}_outcome_${i}`,
    text: replacePlaceholders(o, feature1, feature2, feature3, zoneName),
    detail: '',
    category: 'outcome' as const,
    role: roleKey,
    taskType: taskKey,
    featureRef: i === 0 ? feature1 : undefined,
  }));

  console.log(`TASK_CARDS_GENERATED: ${roleKey}/${taskKey} for ${zoneName} — ${actionCards.length} actions, ${whoCards.length} who, ${outcomeCards.length} outcomes`);

  return { actionCards, methodCards, whoCards, outcomeCards };
}

export function getCrossPerspectiveBenefits(excludeRole: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [role, benefits] of Object.entries(CROSS_PERSPECTIVE_BENEFITS)) {
    if (role !== excludeRole.toLowerCase()) {
      result[role] = benefits;
    }
  }
  return result;
}
