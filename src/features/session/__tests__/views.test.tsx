/**
 * Rendu des vues « ligne fautive » et « assemble la ligne » : on touche, on
 * vérifie, et la réponse remontée est la bonne (avec son explication quand
 * elle est fausse).
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { BugLineExercise, CaseExercise, ComposeExercise, MatchExercise, QcmExercise } from '@/game';

import { BugLineView } from '../BugLineView';
import { CaseView } from '../CaseView';
import { ComposeView } from '../ComposeView';
import { MatchView } from '../MatchView';
import { QcmView } from '../QcmView';
import { SessionActionProvider } from '../SessionAction';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), notificationAsync: jest.fn(), selectionAsync: jest.fn() }), { virtual: true });
jest.mock('expo-audio', () => ({ createAudioPlayer: () => ({ play: jest.fn(), seekTo: jest.fn() }), setAudioModeAsync: jest.fn() }), { virtual: true });
jest.mock('expo-notifications', () => ({}), { virtual: true });
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }, useLocalSearchParams: () => ({}) }));
jest.mock('@/ui/Icon', () => ({ Icon: () => null }));
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

const caseEx: CaseExercise = {
  kind: 'case',
  key: 'mkt-case-1:x:1',
  unitId: 'mkt-case-1',
  title: 'Le trafic s’effondre',
  scenario: 'Le trafic organique a chuté de 40 % en une semaine.',
  steps: [
    { prompt: 'Première piste ?', choices: ['Mise à jour Google', 'Panne du CDN', 'Saisonnalité', 'Concurrent'], answer: 0, feedback: 'Regarde les dates.' },
    { prompt: 'Ensuite ?', choices: ['Comparer les pages touchées', 'Tout réécrire', 'Acheter des liens', 'Attendre'], answer: 0, feedback: 'Isole les pages.' },
  ],
  explain: 'Diagnostiquer avant d’agir.',
};

describe('CaseView', () => {
  it('trouve la bonne réponse où que le mélange l’ait placée, étape par étape', () => {
    for (let run = 0; run < 5; run += 1) {
      const onAnswer = jest.fn();
      let tree!: ReactTestRenderer;
      act(() => {
        tree = create(<CaseView exercise={caseEx} onAnswer={onAnswer} locked={false} />);
      });
      pressByText(tree, 'Mise à jour Google');
      pressByText(tree, 'common.check');
      pressByText(tree, 'session.case.next');
      pressByText(tree, 'Comparer les pages touchées');
      pressByText(tree, 'common.check');
      pressByText(tree, 'session.case.finish');
      expect(onAnswer).toHaveBeenCalledWith(true);
    }
  });

  it('une mauvaise décision rend le cas faux', () => {
    const onAnswer = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<CaseView exercise={caseEx} onAnswer={onAnswer} locked={false} />);
    });
    pressByText(tree, 'Panne du CDN');
    pressByText(tree, 'common.check');
    pressByText(tree, 'session.case.next');
    pressByText(tree, 'Comparer les pages touchées');
    pressByText(tree, 'common.check');
    pressByText(tree, 'session.case.finish');
    expect(onAnswer).toHaveBeenCalledWith(false);
  });
});

const match: MatchExercise = {
  kind: 'match',
  key: 'seo-1:match:1',
  unitId: 'seo-1',
  pairs: [
    { left: 'SEO', right: 'Référencement naturel' },
    { left: 'SEA', right: 'Référencement payant' },
    { left: 'CTR', right: 'Taux de clic' },
  ],
  explain: '',
};

describe('MatchView', () => {
  it('toucher deux fois la même mauvaise paire ne compte qu’une erreur', () => {
    jest.useFakeTimers();
    const onAnswer = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<MatchView exercise={match} onAnswer={onAnswer} locked={false} />);
    });
    pressByText(tree, 'SEO');
    pressByText(tree, 'Taux de clic');
    act(() => jest.advanceTimersByTime(400));
    pressByText(tree, 'Taux de clic');
    act(() => jest.advanceTimersByTime(400));
    pressByText(tree, 'Référencement naturel');
    pressByText(tree, 'SEA');
    pressByText(tree, 'Référencement payant');
    pressByText(tree, 'CTR');
    pressByText(tree, 'Taux de clic');
    expect(onAnswer).toHaveBeenCalledWith(true);
    jest.useRealTimers();
  });
});

describe('Bouton d’action dans la barre fixe', () => {
  const qcm: QcmExercise = {
    kind: 'qcm',
    key: 'seo-1:def:1',
    unitId: 'seo-1',
    prompt: 'Que signifie SEO ?',
    choices: ['Référencement naturel', 'Publicité', 'Réseaux sociaux', 'Emailing'],
    answer: 0,
    explain: '',
  };

  it('dans une session, la vue confie « Vérifier » à l’écran au lieu de le rendre', () => {
    const setAction = jest.fn();
    const api = { setAction, scrollToTop: jest.fn() };
    const onAnswer = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <SessionActionProvider value={api}>
          <QcmView exercise={qcm} onAnswer={onAnswer} locked={false} />
        </SessionActionProvider>,
      );
    });
    expect(() => pressByText(tree, 'common.check')).toThrow();
    const first = setAction.mock.calls.at(-1)?.[0];
    expect(first).toMatchObject({ label: 'common.check', disabled: true });
    pressByText(tree, 'Référencement naturel');
    const ready = setAction.mock.calls.at(-1)?.[0];
    expect(ready).toMatchObject({ disabled: false });
    act(() => ready.onPress());
    expect(onAnswer).toHaveBeenCalledWith(true, undefined);
    act(() => tree.unmount());
    expect(setAction).toHaveBeenLastCalledWith(null);
  });
});
