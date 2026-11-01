# 💰 Meu Bolso — Controle Financeiro Inteligente

> Um aplicativo de gestão financeira focado no controle de teto de gastos, gestão consciente de cartão de crédito e desaceleração de compras por impulso.

![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-orange)
![Licença](https://img.shields.io/badge/Licença-MIT-blue)
![Plataforma](https://img.shields.io/badge/Plataforma-Android%20%7C%20Web-brightgreen)

---

## 📌 Sobre o Projeto

O **Meu Bolso** nasce para resolver o problema clássico das planilhas e apps de finanças complexos: a perda de controle sobre compras parceladas e gastos por impulso. 

A proposta central é dar visibilidade **em tempo real** do impacto de cada compra no seu teto mensal, dividindo de forma realista quanto do seu orçamento já está comprometido com parcelas e gastos recorrentes.

---

## 🔥 Principais Diferenciais

- **Freio de Impulso Integrado:** Recursos psicológicos para desacelerar decisões financeiras precipitadas.
- **Visão Realista de Parcelamentos:** Acompanhamento dinâmico do limite comprometido mês a mês.
- **Foco em Usabilidade:** Lançamento ultrarrápido com o mínimo de toques possível.

---

## 🗺️ Roadmap de Funcionalidades e Melhorias

### 🚀 1. Prioridades Imediatas (Próxima Release)

- ✏️ **Edição & Backup de Dados:**
  - Permite editar lançamentos já efetuados (em vez de apenas excluir).
  - Exportação e importação de dados (`JSON`/`CSV`) para garantir persistência dos dados e evitar perda ao reinstalar o APK.
- 🔁 **Gastos Fixos Recorrentes:**
  - Automatização de custos fixos (aluguel, internet, assinaturas) com renovação mensal automática.
- 📅 **Gestão de Vencimento de Faturas:**
  - Cadastro do ciclo da fatura com alertas dinâmicos antes do vencimento e baixa manual de fatura paga.
- ⏳ **Lista de Espera 24h (Freio de Impulso):**
  - Trava temporária para compras não essenciais: registre o item e confirme 24 horas depois se a intenção de compra persiste.

---

### 🛡️ 2. Módulo de Combate às Compras por Impulso

- 📊 **Simulador "Posso Comprar Isto?":**
  - Analisa o impacto instantâneo de uma nova compra no teto mensal, limite total do cartão e parcelas futuras antes do fechamento.
- 🏷️ **Categorização por Relevância (Desejo vs. Necessidade):**
  - Classificação de despesas para relatórios mensais detalhando o percentual direcionado a itens não essenciais.
- ⚖️ **Cálculo de Impacto de Parcelamento:**
  - Exibição percentual do comprometimento da renda (ex: *"Esta compra comprometerá 8% do seu teto pelos próximos 12 meses"*).

---

### 📈 3. Orçamento & Planejamento Financeiro

- 🎯 **Teto Granular por Categoria:**
  - Limites orçamentários específicos (ex: lazer, delivery) adicionais ao teto global.
- 💵 **Gestão de Renda & Poupança:**
  - Cálculo de teto operacional a partir da Renda Líquida subtraída de metas de investimentos/poupança pré-definidas.
- 📉 **Análise Comparativa & Gráficos:**
  - Comparativos intermensais e gráficos de dispersão/pizza por categoria.
- 🧮 **Calculadora de Parcelas com Juros:**
  - Ajuste de cálculo para refletir taxas aplicadas por operadoras financeiras no valor final das parcelas.
- 🩺 **Simulador de Quitação de Dívidas:**
  - Estratégias de amortização (método bola de neve ou juros mais altos) para faturas em atraso e empréstimos.

---

### 🌐 4. Escala & Arquitetura Web/Cloud (Visão de Longo Prazo)

- 🔐 **Autenticação & Sincronização Cloud:**
  - Implementação de backend/banco de dados na nuvem para acesso multi-dispositivo.
- 📥 **Importação de Extratos & Open Finance:**
  - Suporte a leitura de arquivos `.OFX` e integração futura via APIs de Open Finance para reconciliação automática.
- 🛡️ **Privacidade & Conformidade LGPD:**
  - Criptografia end-to-end de dados sensíveis e conformidade total com as diretrizes de proteção de dados.

---

## 🛠️ Tecnologias Utilizadas

> *(Atualize esta seção com a stack real do seu projeto, ex: Flutter, React Native, SQLite, Node.js, etc.)*

- **Frontend:** [Adicione aqui, ex: Flutter / React Native]
- **Armazenamento Local:** [Adicione aqui, ex: SQLite / Hive / Async Storage]
- **Linguagem:** [Adicione aqui, ex: Dart / TypeScript]

---

## 💻 Como Executar o Projeto

```bash
# Clone este repositório
$ git clone https://github.com/Rogrinhu/Meu_Bolso.git

# Acesse a pasta do projeto
$ cd Meu_Bolso

# Instale as dependências
$ npm install # ou flutter pub get

# Execute a aplicação
$ npm start # ou flutter run
```

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
*Desenvolvido por [Rogrinhu](https://github.com/Rogrinhu)*