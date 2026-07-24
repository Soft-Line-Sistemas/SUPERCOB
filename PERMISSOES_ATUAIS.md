# Permissões atuais do SUPERCOB

Documento de referência das permissões **atualmente implementadas** no sistema, revisado em 23/07/2026. Ele descreve o comportamento real do código; não é uma proposta de política de acesso.

## Perfis existentes

- `ADM` e `ADMIN`: administradores. Para as regras de administração, os dois são equivalentes.
- `ESCRITORIO`: equipe de escritório.
- `GERENTE`: responsável pela própria carteira.
- `OPERADOR`: usuário operacional legado; o sistema ainda o reconhece, mas ele não pode ser escolhido na tela de criação/edição de usuários.

> **Lacuna identificada:** o perfil `OPERADOR` está presente no banco e é tratado em várias regras de acesso, mas não aparece em **Nível de Permissão**. A tela só disponibiliza `ADM`, `ESCRITORIO` e `GERENTE`; por isso não é possível criar nem atribuir Operador pela interface. Isso indica uma implementação incompleta ou uma migração inacabada entre os perfis Operador e Gerente.

## Resumo por funcionalidade

| Funcionalidade | ADM / ADMIN | Escritório | Gerente | Operador |
| --- | --- | --- | --- | --- |
| Entrar no dashboard, clientes, empréstimos, relatórios, chat e perfil | Sim | Sim | Sim | Sim |
| Acessar Usuários e Arquivados pela tela | Sim | Não | Não | Não |
| Ver lista de clientes | Todos | Todos | Somente clientes da própria carteira | Todos* |
| Criar ou editar cliente | Sim | Sim | Sim | Sim |
| Excluir cliente definitivamente | Sim | Não | Somente da própria carteira | Não |
| Arquivar/restaurar cliente | Sim | Não | Não | Não |
| Ver lista de contratos | Todos | Todos | Somente os próprios | Todos* |
| Criar ou editar contrato | Sim | Sim | Sim | Não |
| Registrar pagamento parcial | Sim | Sim | Sim | Sim |
| Concluir contrato (dar baixa / marcar quitado) | Sim | Sim | Somente da própria carteira | Não |
| Cancelar contrato | Sim | Sim | Sim | Sim |
| Reabrir contrato cancelado ou quitado | Sim | Sim | Não | Não |
| Excluir contrato definitivamente | Sim | Não | Não | Não |
| Arquivar/restaurar contrato | Sim | Não | Não | Não |
| Alterar responsável do contrato | Sim | Não | Não | Não |
| Gerenciar usuários | Sim | Não pela tela** | Não | Não |

\* O código atual não aplica um filtro específico de lista para `OPERADOR`; portanto, ele enxerga todos os clientes e contratos nas listagens. Ao abrir o detalhe de um cliente, porém, o Operador só é aceito se existir ao menos um contrato daquele cliente atribuído a ele. Essa regra é inconsistente e merece ajuste caso a intenção seja limitar o Operador à própria carteira.

\** A ação de gerenciamento de usuários aceita o perfil Escritório e limita a manipulação de administradores, mas a rota `/usuarios` é bloqueada para Escritório. Na prática, pela interface normal, somente ADM/ADMIN acessam a tela.

## O que significa “dar baixa”

Neste sistema, o termo deve ser entendido como **concluir/quitar um contrato**, e não como apagar o cadastro do cliente.

Escritório pode registrar pagamentos, concluir e reabrir contratos. Gerência pode fazer isso apenas na própria carteira. Operador pode registrar pagamentos parciais, mas não pode lançar um pagamento que quite o contrato.

Portanto, a baixa **não exige senha adicional** e pode ser feita por ADM/ADMIN, Escritório e Gerência (somente na própria carteira).

## Exclusão de cliente

A exclusão definitiva de um cliente é exclusiva de `ADM` e `ADMIN`. Ela pode falhar quando há contratos vinculados ao cliente. Para preservar histórico, a alternativa disponível para administradores é **arquivar** o cliente, que permite restauração posterior.

## Pontos importantes para uma futura regra de baixa

Caso a regra de negócio seja “somente administrador pode dar baixa”, é necessário restringir no servidor, e não somente esconder o botão na tela:

1. Bloquear o registro de pagamento para os perfis não administrativos, ou definir quais deles podem registrar pagamentos.
2. Bloquear a alteração de status para `QUITADO` para os perfis não administrativos.
3. Impedir que a edição do contrato marque `quitadoEm`/`QUITADO` sem autorização.
4. Se desejado, pedir a senha do administrador como confirmação antes da baixa.

## Fonte das regras

- Autorização das rotas: `src/lib/auth.config.ts`.
- Clientes: `src/app/(dashboard)/clientes/actions.ts`.
- Contratos: `src/app/(dashboard)/emprestimos/actions.ts` e `src/app/(dashboard)/emprestimos/[id]/actions.ts`.
- Usuários: `src/app/(dashboard)/usuarios/actions.ts`.
