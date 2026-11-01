#!/bin/sh
# APK rápido sem Gradle/Capacitor (só para teste local).
# Uso: sh scripts/apk-local/build.sh   -> gera scripts/apk-local/MeuBolso.apk a partir de www/index.html
set -e
cd "$(dirname "$0")"
SDK="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"; BT="$SDK/build-tools/35.0.0"; JAR="$SDK/platforms/android-35/android.jar"
rm -rf build && mkdir -p build/classes build/assets
cp ../../www/index.html build/assets/index.html
"$BT/aapt2" compile --dir res -o build/res.zip
"$BT/aapt2" link -o build/unsigned.apk -I "$JAR" --manifest AndroidManifest.xml -A build/assets build/res.zip
javac --release 11 -nowarn -classpath "$JAR" -d build/classes src/com/meubolso/app/*.java
cmd //c "$BT\d8.bat" --lib "$JAR" --min-api 24 --output build $(find build/classes -name '*.class')
(cd build && jar uf unsigned.apk classes.dex)
"$BT/zipalign" -f 4 build/unsigned.apk build/aligned.apk
[ -f debug.keystore ] || keytool -genkeypair -keystore debug.keystore -storepass android -keypass android \
  -alias meubolso -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Meu Bolso" >/dev/null 2>&1
cmd //c "$BT\apksigner.bat" sign --ks debug.keystore --ks-pass pass:android --ks-key-alias meubolso \
  --out MeuBolso.apk build/aligned.apk
rm -f MeuBolso.apk.idsig
echo "OK -> $(pwd)/MeuBolso.apk"
