# Meu Bolso: projeto para gerar o APK

Esta pasta é o app **Meu Bolso** (a mesma interface do protótipo) empacotado com o Capacitor para virar um app Android. A interface está em `www/index.html`.

Importante: eu não consegui compilar o APK dentro do ambiente onde montei isto (sem acesso ao SDK do Android), então o build **não foi testado**. Se algum passo falhar, copie a mensagem de erro e mande para o Claude.

## Opção A: sem instalar nada (precisa só de conta no GitHub)

1. No GitHub, crie um repositório novo (pode ser privado).
2. Envie todo o conteúdo desta pasta para ele (botão **Add file > Upload files**). Inclua a pasta `.github`. Ela pode ficar oculta no seu computador: no Mac use Cmd+Shift+. para mostrar.
3. Abra a aba **Actions**, escolha **Gerar APK** e clique em **Run workflow**. Leva uns 5 a 10 minutos.
4. Quando terminar, abra a execução e baixe o arquivo **meu-bolso-apk** (um zip com o `app-debug.apk`).
5. Passe o `app-debug.apk` para o celular, abra e permita a instalação de apps de fontes desconhecidas quando o Android pedir.

## Opção B: no seu computador, com Android Studio

Precisa de Node 20+, JDK 21 e Android Studio.

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

No Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

## Bom saber

- Os dados ficam guardados no próprio aparelho. Desinstalar o app ou limpar os dados dele apaga tudo.
- As fontes são carregadas da internet. Sem conexão o app usa a fonte padrão do celular, sem perder nenhuma função.
- Este é um APK de teste (debug), bom para uso pessoal. Para publicar na Play Store é preciso gerar uma versão assinada (release), além de ícone e nome definitivos.
- Para mudar a interface depois, edite `www/index.html` e gere o APK de novo.
