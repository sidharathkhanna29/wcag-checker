// Requirement 3: classify by type, severity and WCAG criteria; compute counts.

// axe categories whose failures directly affect screen-reader users
const SCREEN_READER_CATEGORIES = new Set([
  'cat.aria', 'cat.name-role-value', 'cat.text-alternatives',
  'cat.semantics', 'cat.structure', 'cat.forms', 'cat.tables', 'cat.language',
]);

export function classify(axeViolations) {
  return axeViolations.map((v) => {
    const category = v.tags.find((t) => t.startsWith('cat.')) || 'cat.other';
    const criteria = v.tags
      .map((t) => t.match(/^wcag(\d)(\d)(\d+)$/))
      .filter(Boolean)
      .map((m) => `${m[1]}.${m[2]}.${m[3]}`);
    const levelTag = v.tags.find((t) => /^wcag2\d?a{1,2}$/.test(t));
    return {
      rule_id: v.id,
      type: category.replace('cat.', ''),
      severity: v.impact || 'minor',
      wcag_criteria: criteria,
      wcag_level: levelTag ? (levelTag.endsWith('aa') ? 'AA' : 'A') : null,
      is_screen_reader: SCREEN_READER_CATEGORIES.has(category),
      description: v.description,
      help: v.help,
      help_url: v.helpUrl,
      node_count: v.nodes.length,
      nodes: v.nodes.slice(0, 20).map((n) => ({
        html: n.html, target: n.target, summary: n.failureSummary,
      })),
    };
  });
}

export function computeCounts(classified) {
  return {
    total: classified.reduce((s, v) => s + v.node_count, 0),            // every failing element
    unique: classified.length,                                           // distinct rules broken
    screenReader: classified.filter((v) => v.is_screen_reader)
                            .reduce((s, v) => s + v.node_count, 0),
  };
}
