#!/usr/bin/env bash
# יוצר פעם אחת את מפתח החתימה של Android ומדפיס את הערכים ל-GitHub Secrets.
# שמרו את קובץ ה-jks ואת הסיסמה במקום בטוח – בלעדיהם אי אפשר לעדכן את האפליקציה.
set -euo pipefail

OUT_DIR="${1:-signing}"
ALIAS="${ANDROID_KEY_ALIAS:-trainandfit}"
DNAME="${DNAME:-CN=TrainAndFit, O=TrainAndFit, C=IL}"
KEYSTORE="$OUT_DIR/trainandfit-release.jks"

if [[ -e "$KEYSTORE" ]]; then
  echo "Keystore already exists at $KEYSTORE - refusing to overwrite." >&2
  exit 1
fi
mkdir -p "$OUT_DIR"
PASSWORD="$(openssl rand -base64 24 | tr -d '/+=')"

keytool -genkeypair -v \
  -keystore "$KEYSTORE" -storetype PKCS12 \
  -alias "$ALIAS" -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass "$PASSWORD" -keypass "$PASSWORD" \
  -dname "$DNAME"

base64 -w0 "$KEYSTORE" > "$OUT_DIR/keystore.base64.txt" 2>/dev/null || base64 -i "$KEYSTORE" > "$OUT_DIR/keystore.base64.txt"

cat > android/keystore.properties <<PROPS
storeFile=../$KEYSTORE
storePassword=$PASSWORD
keyAlias=$ALIAS
keyPassword=$PASSWORD
PROPS

cat <<INFO

Keystore created: $KEYSTORE (git-ignored)

Add these GitHub secrets (Settings -> Secrets and variables -> Actions):
  ANDROID_KEYSTORE_BASE64   = contents of $OUT_DIR/keystore.base64.txt
  ANDROID_KEYSTORE_PASSWORD = $PASSWORD
  ANDROID_KEY_ALIAS         = $ALIAS
  ANDROID_KEY_PASSWORD      = $PASSWORD
INFO
