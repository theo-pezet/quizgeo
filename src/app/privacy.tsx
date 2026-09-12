import { CARDS, EXERCISES, UNITS } from '@/content';
import { Card, Screen, Text } from '@/ui';

/** Politique de confidentialité — aussi exigée par le Play Store. */
export default function PrivacyScreen() {
  return (
    <Screen>
      <Text variant="title">Confidentialité</Text>
      <Card>
        <Text variant="bodyBold">Aucune donnée ne quitte ton appareil.</Text>
        <Text variant="small">
          Quiz GEO fonctionne entièrement hors ligne. Ta progression (XP, série, couronnes, deck, gemmes, réglages) est
          enregistrée uniquement sur ton téléphone ou dans ton navigateur. L’application ne crée pas de compte, ne demande ni
          email ni nom, n’envoie rien à un serveur et n’utilise aucun outil de mesure d’audience.
        </Text>
      </Card>
      <Card>
        <Text variant="bodyBold">Permissions</Text>
        <Text variant="small">
          Notifications (facultatif) : uniquement pour les rappels locaux que tu actives dans le Profil — programmés sur
          l’appareil, sans serveur. Vibrations : pour le retour des réponses. Rien d’autre.
        </Text>
      </Card>
      <Card>
        <Text variant="bodyBold">Ligue</Text>
        <Text variant="small">
          Les adversaires de la ligue sont simulés par l’application. Aucun classement n’est partagé avec d’autres personnes.
        </Text>
      </Card>
      <Card>
        <Text variant="bodyBold">Publicité</Text>
        <Text variant="small">
          Cette version ne contient aucune publicité ni aucun SDK publicitaire. Si une version future en intègre, ton
          consentement sera demandé au préalable et cette page sera mise à jour.
        </Text>
      </Card>
      <Card>
        <Text variant="bodyBold">Effacer mes données</Text>
        <Text variant="small">
          Profil → « Réinitialiser ma progression », ou désinstaller l’application : il ne reste rien ailleurs.
        </Text>
      </Card>
      <Text variant="small" secondary>
        Quiz GEO · {UNITS.length} unités · {EXERCISES.length} exercices · {CARDS.length} cartes · éditeur : Cité par l’IA
        (cite-par-lia.fr). Dernière mise à jour : septembre 2026.
      </Text>
    </Screen>
  );
}
