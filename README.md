# Meu Bolso

Controle de gastos, cartões e teto mensal. App em um único HTML (`www/index.html`),
empacotado para Android com [Capacitor](https://capacitorjs.com/).
Os dados ficam salvos no `localStorage` do próprio aparelho.

## Estrutura

```
www/index.html            app (fonte única)
capacitor.config.json     configuração do Capacitor
package.json              dependências do Capacitor
.github/workflows/apk.yml gera o APK no GitHub Actions
scripts/apk-local/        build rápido sem Gradle, para teste local
```

## Gerar o APK

**Pelo GitHub (recomendado):** cada push na `main` roda o workflow *Gerar APK*.
O arquivo fica em *Actions → execução → Artifacts → meu-bolso-apk*.
Também dá para rodar manualmente em *Actions → Gerar APK → Run workflow*.

**Local com Capacitor** (precisa de Android SDK):

```sh
npm install
npx cap add android   # só na primeira vez
npx cap sync android
cd android && ./gradlew assembleDebug
```

**Local rápido, sem Gradle** (precisa de JDK 17+ e Android SDK com
`platforms;android-35` e `build-tools;35.0.0`):

```sh
sh scripts/apk-local/build.sh   # gera scripts/apk-local/MeuBolso.apk
```

## Bom saber

- Os dados ficam no próprio aparelho. Desinstalar o app ou limpar os dados dele apaga tudo.
- As fontes vêm da internet. Sem conexão o app usa a fonte padrão do celular, sem perder função.
- O APK gerado é de teste (debug), bom para uso pessoal. Para a Play Store é preciso uma versão release assinada.
