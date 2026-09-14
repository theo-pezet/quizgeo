/**
 * Point d'entrée du cœur de règles.
 *
 * Le reste de l'application n'importe QUE depuis ici. Aucun composant, aucun
 * store ne doit atteindre un module interne directement : c'est ce qui garde
 * la frontière lisible et la couverture à 100 % vérifiable.
 */

export * from './types';
export * from './dates';
export * from './xp';
export * from './review';
export * from './mastery';
export * from './streak';
export * from './session';
export * from './badges';
export * from './srs';
export * from './ads';
export * from './energy';
export * from './economy';
export * from './quests';
export * from './league';
export * from './migrations';
export * from './reminders';
export * from './daily';
export * from './random';
export * from './apply';
export * from './placement';
export * from './monthly';
