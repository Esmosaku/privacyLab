export const rivals = [
  { id: 'titForTat', name: 'Northwind', symbol: 'waves' },
  { id: 'grimTrigger', name: 'Harbor', symbol: 'rings' },
  { id: 'alwaysSolo', name: 'Summit', symbol: 'peaks' },
  { id: 'random', name: 'Cascade', symbol: 'arcs' },
] as const;
export const introCopy = {
  brand: 'PrivacyLab', home: 'Home', about: 'About',
  title: 'Strategy Room', subtitle: 'Can you trust your rival?',
  description: 'Six rounds. Two choices. One fragile partnership.',
  steps: [
    { title: 'Choose:', text: 'Share data or Keep Private.' },
    { title: 'Reveal:', text: 'See both moves and earn points.' },
    { title: 'Adapt:', text: 'Learn from your rival’s behavior.' },
  ],
  rivalTitle: 'Choose your rival',
  rivalHint: 'Their strategy is revealed at the end.',
  start: 'Start game',
  note: 'Game scores are modeled points. No actual banking data is shared.',
};

export const gameCopy = {
 title: 'Strategy Room', subtitle: 'Can you trust your rival?', you: 'You', them: 'Them', points: 'pts',
 moveTitle: 'Make your move.', moveHint: 'Both banks choose without seeing the other’s move.',
 share: 'Share Data', solo: 'Keep Private', trust: 'Trust', trustNote: 'A game indicator, not a prediction.',
 history: 'Round history', emptyHistory: 'Your first result will appear here.',
 deciding: 'Your rival is deciding…', next: 'Next round', results: 'See results',
 chart: 'Score over rounds', chartHint: 'Cumulative game points.', emptyChart: 'Play a round to see your score trend.',
 outcomes: 'Possible outcomes', assumption: 'Modeled assumption', outcomeCaption: 'Your points / rival’s points.',
 rows: ['Both share', 'You share, they keep private', 'You keep private, they share', 'Both keep private'],
 evidence: 'From the Experiment Lab', viewEvidence: 'View evidence', evidenceNote: 'Experiment results are separate from game points. Your moves do not change these results.',
 footer: 'Game scores are modeled points. No actual banking data is shared.',
};
export const reveals = {
 mutual: { title: 'Alliance!', text: 'You both shared. Cooperation paid off this round.' },
 betrayed: { title: 'You shared. They kept private.', text: 'Your rival benefited while you received the lower payoff.' },
 freeRide: { title: 'You benefited from their sharing.', text: 'They shared while you kept your data private.' },
 standoff: { title: 'Standoff.', text: 'You both kept your data private.' },
};
export const personas: Record<string, {name: string; text: string}> = {
 titForTat: {name: 'The Mirror', text: 'Shared first, then copied your previous move.'},
 grimTrigger: {name: 'The Grudge', text: 'Shared until you kept private once, then never shared again.'},
 alwaysSolo: {name: 'The Lone Wolf', text: 'Kept private every round.'},
 random: {name: 'The Wildcard', text: 'Chose randomly each round.'},
};
