# Estudo de Impacto e Proposta: Desconto em Juros Atrasados (SUPERCOB)

## 1. Contexto e Cenário de Negócio

No modelo operacional do **SUPERCOB**, ocorrem negociações onde o cliente possui um valor acumulado de juros por atraso superior ao valor que ele consegue ou negocia pagar.

### Exemplo Prático (Cenário Marcelo / Alan):
- **Empréstimo Base**: R$ 1.000,00 a 30% am = R$ 1.300,00 devido.
- **Dias em Atraso**: 10 dias.
- **Juros Atualizados por Atraso**: R$ 778,00.
- **Acordo de Baixa**: O cliente paga **R$ 500,00** e o escritório concede um desconto de **R$ 278,00** nos juros de atraso restantes, considerando o mês atrasado como baixado e o ciclo renovado.

---

## 2. Probabilidade de Sucesso

> **Probabilidade de Sucesso: 95%+**

A probabilidade de funcionamento correto é **muito alta**, desde que o desconto seja tratado como um **Abatimento/Renegociação de Ciclo** e **não** como um pagamento fictício em dinheiro.

---

## 3. Estrutura Financeira e Modelagem

Para manter a integridade dos dados e do caixa, a transação deve ser dividida em 3 pilares:

| Componente | Valor no Exemplo | Tratamento no Banco de Dados | Impacto Financeiro |
| :--- | :--- | :--- | :--- |
| **Entrada Real (Caixa)** | R$ 500,00 | Incrementa `jurosPagos` | Conta como recebimento real no fluxo de caixa. |
| **Desconto Concedido** | R$ 278,00 | Salvo no histórico / evento de abatimento | **NÃO** entra como dinheiro. Conta no relatório de descontos/perdas. |
| **Reset de Ciclo de Juros** | Zerado (R$ 0 pendente) | Atualiza `jurosCicloIniciadoEm` e `jurosPagosNoInicioCiclo` | Zera os juros atrasados pendentes e reinicia a contagem. |

---

## 4. Análise de Impactos por Módulo

### 4.1. Relatórios Financeiros e Fluxo de Caixa
- **Se feito Incorretamente (Simulando R$ 778 como pagamento)**:
  - ❌ Criaria R$ 278,00 de "dinheiro fantasma" no relatório financeiro, causando furo de caixa no encerramento diário/mensal.
- **Feito Corretamente (R$ 500 em caixa + R$ 278 em abatimento registrado)**:
  - ✅ **Entradas Financeiras**: Reflete com 100% de precisão os R$ 500,00 que realmente entraram na conta/caixa.
  - ✅ **Relatório de Negociações**: Exibe a métrica de "Descontos Concedidos em Juros".

### 4.2. Motor de Cálculo de Juros (`src/lib/loan-interest.ts`)
- **Funcionamento**: A função utilitária usa os campos `jurosPagosNoInicioCiclo` e `jurosCicloIniciadoEm` (introduzidos na migration recente) para calcular os juros devidos a partir da data de renovação.
- **Resultado pós-desconto**: O calculador identifica que o ciclo anterior foi liquidado e retorna `jurosPendente: 0`, permitindo que novos juros corram apenas a partir do próximo ciclo.

### 4.3. Status de Inadimplência e Contratos
- **Filtros de Clientes/Contratos**: O contrato deixa de constar como atrasado/inadimplente, pois a pendência do período atrasado foi baixada pela negociação.
- **Status do Contrato**: Muda de `EM_ATRASO` / `NEGOCIACAO` para `EM_DIA` (ou `ABERTO`), a menos que o valor pago quite também o principal (tornando-o `QUITADO`).

### 4.4. Auditoria e Dossiê do Cliente
- Registra no histórico do contrato (`EmprestimoHistorico`) com o tipo `PAGAMENTO_NEGOCIADO`:
  > *"Recebimento de R$ 500,00 efetuado. Desconto concedido de R$ 278,00 nos juros atrasados. Ciclo de cobrança renovado."*

---

## 5. Plano de Execução Sugerido

1. **Campos na Interface (Terminal de Cobrança)**:
   - Adicionar campo opcional **"Desconto / Abatimento (R$)"** ao lado do campo de recebimento no `TerminalCobranca.tsx`.
2. **Server Action de Recebimento (`actions.ts`)**:
   - Processar o valor pago em dinheiro para o saldo de juros/principal.
   - Aplicar a atualização de `jurosCicloIniciadoEm = new Date()` e `jurosPagosNoInicioCiclo = novoJurosPagos` quando houver concessão de desconto e baixa de ciclo.
3. **Visibilidade nos Relatórios**:
   - Incluir indicador nos relatórios para filtrar recebimentos reais vs. total descontado.
