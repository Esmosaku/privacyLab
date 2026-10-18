export const rivals = [
  { id: 'titForTat', name: 'Northwind', symbol: 'waves' },
  { id: 'grimTrigger', name: 'Harbor', symbol: 'rings' },
  { id: 'alwaysSolo', name: 'Summit', symbol: 'peaks' },
  { id: 'random', name: 'Cascade', symbol: 'arcs' },
] as const;
export const introCopy = {
  brand: 'PrivacyLab', home: 'Home', about: 'About',
  title: 'Strategy Room', subtitle: 'Can you trust your rival?',
  description: 'Six quarters. Two choices. One fragile partnership.',
  goal: 'Your goal: save your bank the most money from fraud.',
  steps: [
    { title: 'Choose:', text: 'Share data or Keep Private.' },
    { title: 'Reveal:', text: 'See both moves and how much each bank saved.' },
    { title: 'Adapt:', text: 'Learn from your rival’s behavior.' },
  ],
  rivalTitle: 'Choose your rival',
  rivalHint: 'Their strategy is revealed at the end.',
  start: 'Start game',
  note: 'Dollar amounts are fraud losses avoided in this game. No real banking data is shared.',
};

export const gameCopy = {
 title: 'Strategy Room', subtitle: 'Can you trust your rival?', you: 'You', them: 'Them', points: 'pts',
 moveTitle: 'Make your move.', moveHint: 'Both banks choose without seeing the other’s move.',
 share: 'Share Data', solo: 'Keep Private', trust: 'Trust', trustNote: 'A game indicator, not a prediction.',
 history: 'Quarter history', emptyHistory: 'Your first result will appear here.',
 deciding: 'Your rival is deciding…', next: 'Next quarter', results: 'See results',
 chart: 'Score over rounds', chartHint: 'Cumulative game points.', emptyChart: 'Play a round to see your score trend.',
 outcomes: 'What each choice saves', assumption: 'Modeled assumption', outcomeCaption: 'Per quarter',
 rows: ['You both share', 'You share, they don’t', 'They share, you don’t', 'Neither shares'],
 evidence: 'From the Experiment Lab', viewEvidence: 'View evidence', evidenceNote: 'Experiment results are separate from game points. Your moves do not change these results.',
 footer: 'Dollar amounts are fraud losses avoided in this game. Only the sharing bonus is measured; other payoffs are modeled assumptions. No real banking data is shared.',
};
export const reveals = {
 mutual: { title: 'Alliance!', text: 'You both shared. Cooperation paid off this quarter.' },
 betrayed: { title: 'You shared. They kept private.', text: 'Your rival benefited while you received the lower payoff.' },
 freeRide: { title: 'You benefited from their sharing.', text: 'They shared while you kept your data private.' },
 standoff: { title: 'Standoff.', text: 'You both kept your data private.' },
};
export const personas: Record<string, {name: string; text: string}> = {
 titForTat: {name: 'The Mirror', text: 'Shared first, then copied your previous move.'},
 grimTrigger: {name: 'The Grudge', text: 'Shared until you kept private once, then never shared again.'},
 alwaysSolo: {name: 'The Lone Wolf', text: 'Kept private every quarter.'},
 random: {name: 'The Wildcard', text: 'Chose randomly each quarter.'},
};

// What the measured pooling gain means for the game at the chosen privacy level.
export const verdicts = {
 dontPool: { title: 'At this privacy level, pooling isn’t worth it.', text: 'Pooling barely improves fraud detection here, so the sharing bonus doesn’t cover the risk of exposing your data. Going solo is the sensible choice.' },
 trustNeeded: { title: 'Pooling pays only if both banks keep their word.', text: 'Sharing beats a standoff here, but each bank is tempted to free-ride on the other’s data. Without trust, neither bank shares.' },
 pool: { title: 'Pooling is worth it, with a partner you trust.', text: 'At this privacy level, data from more customers is much more valuable. Mutual sharing becomes a stable choice, as long as your rival shares too.' },
};
