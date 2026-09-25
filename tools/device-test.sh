#!/usr/bin/env bash
# Teste l'APK publié dans un émulateur Android (lancé par .github/workflows/device-test.yml).
# 1. installe la version précédente, fait l'onboarding, puis installe la
#    nouvelle par-dessus (mise à jour, sans perte de progression) ;
# 2. rejoue les scénarios Maestro (.maestro/) sur la nouvelle version ;
# 3. range captures, vidéo, temps de démarrage et plantages dans out/.
set -u
PKG=fr.citeparlia.quizgeo
OUT=out
mkdir -p "$OUT"
log() { echo "== $*" | tee -a "$OUT/rapport.txt"; }

adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0

if [ -f prev.apk ]; then
  log "Installation de la version précédente ($PREV_TAG)"
  adb install prev.apk 2>&1 | tee -a "$OUT/rapport.txt"
  maestro test .maestro/onboarding.yaml --test-output-dir "$OUT/maestro-prev" > "$OUT/maestro-prev.log" 2>&1 || log "onboarding sur l'ancienne version : échec (voir maestro-prev.log)"
  mkdir -p "$OUT/prev" && mv shots/* "$OUT/prev/" 2>/dev/null
  log "Mise à jour vers $TAG par-dessus"
  adb install -r app.apk 2>&1 | tee -a "$OUT/rapport.txt"
  adb shell am start -W -n "$PKG/.MainActivity" | tee -a "$OUT/rapport.txt"
  sleep 12
  adb exec-out screencap -p > "$OUT/00-apres-mise-a-jour.png"
  adb shell am force-stop "$PKG"
  adb uninstall "$PKG" > /dev/null
fi

log "Installation propre de $TAG"
adb install app.apk 2>&1 | tee -a "$OUT/rapport.txt"
log "Démarrage à froid"
adb shell am start -W -n "$PKG/.MainActivity" | tee -a "$OUT/rapport.txt"
sleep 3
adb shell am force-stop "$PKG"

adb logcat -c
adb shell screenrecord --time-limit 170 /sdcard/parcours.mp4 &
REC=$!
for flow in onboarding lesson tabs; do
  log "Scénario $flow"
  maestro test ".maestro/$flow.yaml" --test-output-dir "$OUT/maestro-$flow" > "$OUT/maestro-$flow.log" 2>&1 && log "$flow : OK" || log "$flow : ÉCHEC (voir maestro-$flow.log)"
done
kill -INT $REC 2>/dev/null; sleep 3
adb pull /sdcard/parcours.mp4 "$OUT/parcours.mp4" > /dev/null 2>&1
mv shots/* "$OUT/" 2>/dev/null

log "Plantages et erreurs JS"
adb logcat -d | grep -E "FATAL EXCEPTION|AndroidRuntime|ReactNativeJS.*(Error|error)|ANR in" | head -80 | tee -a "$OUT/rapport.txt"
log "Mémoire"
adb shell dumpsys meminfo "$PKG" | grep -E "TOTAL PSS|TOTAL:" | head -3 | tee -a "$OUT/rapport.txt"
exit 0
