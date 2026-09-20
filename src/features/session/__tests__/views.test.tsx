/**
 * Rendu des vues « ligne fautive » et « assemble la ligne » : on touche, on
 * vérifie, et la réponse remontée est la bonne (avec son explication quand
 * elle est fausse).
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { BugLineExercise, ComposeExercise } from '@/game';

import { BugLineView } from '../BugLineView';
import { ComposeView } from '../ComposeView';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), notificationAsync: jest.fn(), selectionAsync: jest.fn() }), { virtual: true });
jest.mock('expo-audio', () => ({ createAudioPlayer: () => ({ play: jest.fn(), seekTo: jest.fn() }), setAudioModeAsync: jest.fn() }), { virtual: true });
jest.mock('expo-notifications', () => ({}), { virtual: true });
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }, useLocalSearchParams: () => ({}) }));
jest.mock('@/i18n', () => ({ useT: () => (key: string, vars?: Record<string, string>) => `${key}${vars?.line ? ':' + vars.line : ''}` }));

/** Le texte porté par un nœud : chaînes et nombres des <Text> qu'il contient. */
function textOf(node: ReactTestInstance): string {
  return node
    .findAll((n) => String(n.type) === 'Text')
    .map((n) => {
      const kids = Array.isArray(n.props.children) ? n.props.children : [n.props.children];
      return kids.filter((c: unknown) => typeof c === 'string' || typeof c === 'number').join('');
    })
    .join('')
    .trim();
}

/** Presse le DERNIER pressable actif portant ce texte (la banque de morceaux vient après la ligne construite). */
function pressByText(tree: ReactTestRenderer, text: string) {
  const candidates = tree.root.findAll((n) => typeof n.type !== 'string' && n.props.onPress !== undefined && n.props.disabled !== true);
  const hits = candidates.filter((n) => textOf(n) === text);
  const hit = hits[hits.length - 1];
  if (!hit) throw new Error(`Aucun élément pressable « ${text} »`);
  act(() => hit.props.onPress());
}

const bug: BugLineExercise = {
  kind: 'bugline',
  key: 'py-2:w:9',
  unitId: 'py-2',
  prompt: 'Une seule ligne provoque une erreur. Laquelle ?',
  lang: 'python',
  lines: ['price = 19.9', 'qty = input("Qty: ")', 'total = price * qty', 'print(total)'],
  answer: 2,
  explain: 'input renvoie un texte.',
};

const compose: ComposeExercise = {
  kind: 'compose',
  key: 'py-2:w:10',
  unitId: 'py-2',
  prompt: 'Assemble une ligne qui affiche 12.',
  lang: 'python',
  tokens: ['print', '(', '3', '*', '4', ')'],
  extra: ['+'],
  explain: 'L’astérisque multiplie.',
};

describe('BugLineView', () => {
  it('remonte juste quand on touche la ligne fautive, faux sinon avec l’explication générique', () => {
    const onAnswer = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<BugLineView exercise={bug} onAnswer={onAnswer} locked={false} />);
    });
    pressByText(tree, '3total = price * qty');
    pressByText(tree, 'common.check');
    expect(onAnswer).toHaveBeenCalledWith(true, undefined);

    const wrong = jest.fn();
    act(() => {
      tree = create(<BugLineView exercise={bug} onAnswer={wrong} locked={false} />);
    });
    pressByText(tree, '1price = 19.9');
    pressByText(tree, 'common.check');
    expect(wrong).toHaveBeenCalledWith(false, 'session.bugline.wrong');
  });
});

describe('ComposeView', () => {
  it('assemble dans l’ordre → juste ; dans le désordre → faux avec la ligne construite', () => {
    const onAnswer = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<ComposeView exercise={compose} onAnswer={onAnswer} locked={false} />);
    });
    for (const tok of compose.tokens) pressByText(tree, tok);
    pressByText(tree, 'common.check');
    expect(onAnswer).toHaveBeenCalledWith(true, undefined);

    const wrong = jest.fn();
    act(() => {
      tree = create(<ComposeView exercise={compose} onAnswer={wrong} locked={false} />);
    });
    for (const tok of ['print', '(', '3', '+', '4', ')']) pressByText(tree, tok);
    pressByText(tree, 'common.check');
    expect(wrong).toHaveBeenCalledWith(false, 'session.compose.yours:print ( 3 + 4 )');
  });
});
