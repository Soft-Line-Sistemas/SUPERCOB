# Guia para Reproduzir os Testes do SUPERCOB em Python

Este documento foi escrito para ser lido por uma IA e usado como roteiro de reprodução em outro projeto.

O SUPERCOB atual e uma aplicacao Next.js/TypeScript. Os testes existentes nao sao Python; eles foram feitos com Vitest em arquivos `.test.ts`. A reproducao em Python deve preservar o comportamento testado, nao a linguagem original.

## Objetivo

Criar em outro projeto uma suite Python com `pytest` que cubra as mesmas regras de negocio hoje protegidas pelos testes do SUPERCOB:

1. Calculo de juros de emprestimos.
2. Tratamento e validacao de datas.
3. Validacao, mascara e normalizacao de formulario de cliente.

## Onde os testes originais estao

Arquivos de teste usados como fonte:

```text
src/lib/loan-interest.test.ts
src/lib/date-utils.test.ts
src/components/client-modal/__tests__/form-schema.test.ts
```

Arquivos de implementacao que explicam a regra:

```text
src/lib/loan-interest.ts
src/lib/date-utils.ts
src/components/client-modal/form-schema.ts
```

## Framework alvo em Python

Use `pytest`.

Instalacao minima:

```bash
pip install pytest
```

Com cobertura:

```bash
pip install pytest pytest-cov
```

## Estrutura recomendada no projeto Python

```text
seu_projeto/
  app/
    __init__.py
    domain/
      __init__.py
      loan_interest.py
      date_utils.py
      client_form.py
  tests/
    test_loan_interest.py
    test_date_utils.py
    test_client_form.py
  pytest.ini
```

`pytest.ini` recomendado:

```ini
[pytest]
testpaths = tests
python_files = test_*.py
addopts = -q
```

## Contrato das funcoes Python esperadas

A IA que implementar em outro projeto deve criar funcoes equivalentes a estas.

### `calculate_loan_interest`

Arquivo sugerido:

```text
app/domain/loan_interest.py
```

Assinatura sugerida:

```python
def calculate_loan_interest(
    *,
    valor: float,
    valor_pago: float | None = None,
    juros_mes: float | None = None,
    juros_atraso_dia: float | None = None,
    juros_pagos: float | None = None,
    vencimento=None,
    created_at=None,
    now=None,
) -> dict:
    ...
```

Retorno esperado:

```python
{
    "principal_restante": float,
    "juros_base": float,
    "juros_acumulado_total": float,
    "juros_pendente": float,
    "total_devido": float,
    "months_accrued": int,
    "days_late": int,
    "uses_daily_late_interest": bool,
    "next_month_interest": float,
}
```

Regras:

1. `principal_restante = max(valor - valor_pago, 0)`.
2. Se o principal ja foi pago, mas ainda ha juros pendentes, o calculo de juros usa o valor original como base.
3. `juros_base = principal_base_juros * (juros_mes / 100)`.
4. Se `juros_mes <= 0`, nao acumula juros.
5. Se `vencimento` for futuro em relacao a `now`, nao acumula juros.
6. Se existir `juros_atraso_dia > 0`, usar juros diarios compostos sobre `juros_base`.
7. Se nao existir juros diario, usar juros mensais compostos sobre o principal base.
8. Sempre descontar `juros_pagos` de `juros_acumulado_total`.
9. `juros_pendente` nunca pode ser negativo.
10. Datas devem ser comparadas em UTC para evitar erro por horario local.

### `date_utils`

Arquivo sugerido:

```text
app/domain/date_utils.py
```

Funcoes esperadas:

```python
def sanitize_digits(value: str, max_len: int) -> str:
    ...

def parse_date_input_to_utc_noon(value: str):
    ...

def validate_birth_date_parts(dia: str, mes: str, ano: str) -> dict:
    ...
```

Regras:

1. `sanitize_digits` remove tudo que nao for numero e limita o tamanho.
2. `parse_date_input_to_utc_noon` aceita somente `YYYY-MM-DD`.
3. Datas validas devem voltar em UTC ao meio-dia.
4. Datas invalidas devem voltar `None`.
5. `validate_birth_date_parts` deve exigir dia, mes e ano quando qualquer um deles for preenchido.
6. Dia valido: `1` a `31`.
7. Mes valido: `1` a `12`.
8. Ano valido: quatro digitos, entre `1900` e o ano atual.
9. Datas impossiveis, como `31/02/2024`, devem retornar erro.

### `client_form`

Arquivo sugerido:

```text
app/domain/client_form.py
```

Funcoes e constantes esperadas:

```python
TAB_REQUIRED_FIELDS = {
    "basico": ["nome", "whatsapp"],
    "identificacao": ["cpf", "dia_nasc", "mes_nasc", "ano_nasc"],
    "endereco": ["cep", "endereco", "numero_endereco", "bairro", "cidade", "estado"],
    "profissao": [],
    "emergencia": [],
    "cobranca": [],
    "anexos": [],
    "revisao": [],
}

def normalize_digits(value: str) -> str:
    ...

def format_cpf(value: str) -> str:
    ...

def format_cep(value: str) -> str:
    ...

def format_phone_br(value: str) -> str:
    ...

def is_valid_cpf(cpf: str) -> bool:
    ...

def validate_client_payload(data: dict) -> list[str]:
    ...

def normalize_client_payload(data: dict) -> dict:
    ...
```

Regras:

1. CPF deve ser validado por digitos verificadores.
2. CPF com todos os digitos repetidos e invalido.
3. WhatsApp precisa ter pelo menos 10 digitos.
4. CEP precisa ter exatamente 8 digitos.
5. Campos obrigatorios devem gerar erros claros.
6. Payload normalizado deve remover mascaras de CPF, WhatsApp e CEP.
7. Strings vazias opcionais devem virar `None`.
8. Numeros vindos do formulario devem virar `int` quando possivel.

## Suite Python pronta para usar como base

Os exemplos abaixo devem ser adaptados apenas nos imports, caso o projeto use outro nome de pacote.

### `tests/test_loan_interest.py`

```python
from datetime import datetime, timezone

import pytest

from app.domain.loan_interest import calculate_loan_interest


def utc_date(year, month, day, hour=12, minute=0, second=0):
    return datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc)


def test_returns_only_principal_when_there_is_no_monthly_interest():
    result = calculate_loan_interest(
        valor=1000,
        valor_pago=0,
        juros_mes=0,
        juros_atraso_dia=0,
        vencimento=utc_date(2026, 5, 1),
        now=utc_date(2026, 5, 8),
    )

    assert result["principal_restante"] == 1000
    assert result["juros_pendente"] == 0
    assert result["total_devido"] == 1000


def test_does_not_accrue_interest_before_due_date():
    result = calculate_loan_interest(
        valor=1000,
        valor_pago=0,
        juros_mes=5,
        juros_atraso_dia=0,
        vencimento=utc_date(2026, 5, 18),
        now=utc_date(2026, 5, 8),
    )

    assert result["juros_pendente"] == 0
    assert result["total_devido"] == 1000
    assert result["months_accrued"] == 0


def test_accrues_one_monthly_period_on_exact_due_date():
    result = calculate_loan_interest(
        valor=1000,
        valor_pago=0,
        juros_mes=5,
        juros_atraso_dia=0,
        vencimento=utc_date(2026, 5, 8),
        now=utc_date(2026, 5, 8),
    )

    assert result["juros_base"] == 50
    assert result["months_accrued"] == 1
    assert result["juros_pendente"] == 50
    assert result["total_devido"] == 1050


def test_accrues_compounded_monthly_interest_across_calendar_months():
    result = calculate_loan_interest(
        valor=1000,
        valor_pago=0,
        juros_mes=5,
        juros_atraso_dia=0,
        vencimento=utc_date(2026, 2, 10),
        now=utc_date(2026, 5, 8),
    )

    assert result["juros_base"] == 50
    assert result["months_accrued"] == 4
    assert result["juros_pendente"] == pytest.approx(215.50625, rel=1e-6)
    assert result["total_devido"] == pytest.approx(1215.50625, rel=1e-6)
    assert result["next_month_interest"] == pytest.approx(60.7753125, rel=1e-6)


def test_accrues_compounded_daily_late_interest_over_monthly_base():
    result = calculate_loan_interest(
        valor=1000,
        valor_pago=0,
        juros_mes=5,
        juros_atraso_dia=1,
        vencimento=utc_date(2026, 5, 1),
        now=utc_date(2026, 5, 8),
    )

    assert result["juros_base"] == 50
    assert result["days_late"] == 7
    assert result["uses_daily_late_interest"] is True
    assert result["juros_pendente"] == pytest.approx(53.6067676, rel=1e-6)
    assert result["total_devido"] == pytest.approx(1053.6067676, rel=1e-6)


def test_subtracts_already_paid_interest_in_daily_late_mode():
    result = calculate_loan_interest(
        valor=1000,
        valor_pago=0,
        juros_mes=5,
        juros_atraso_dia=1,
        juros_pagos=10,
        vencimento=utc_date(2026, 5, 1),
        now=utc_date(2026, 5, 8),
    )

    assert result["uses_daily_late_interest"] is True
    assert result["juros_acumulado_total"] == pytest.approx(53.6067676, rel=1e-6)
    assert result["juros_pendente"] == pytest.approx(43.6067676, rel=1e-6)
    assert result["total_devido"] == pytest.approx(1043.6067676, rel=1e-6)


def test_clamps_pending_interest_to_zero_when_paid_interest_is_greater():
    result = calculate_loan_interest(
        valor=1000,
        valor_pago=0,
        juros_mes=5,
        juros_atraso_dia=0,
        juros_pagos=999,
        vencimento=utc_date(2026, 5, 8),
        now=utc_date(2026, 5, 8),
    )

    assert result["juros_base"] == 50
    assert result["juros_pendente"] == 0
    assert result["total_devido"] == 1000


def test_computes_daily_delay_by_utc_day_boundaries():
    result = calculate_loan_interest(
        valor=1000,
        valor_pago=0,
        juros_mes=5,
        juros_atraso_dia=1,
        vencimento=utc_date(2026, 5, 1, 23, 59, 59),
        now=utc_date(2026, 5, 2, 0, 0, 1),
    )

    assert result["days_late"] == 1
    assert result["juros_pendente"] == pytest.approx(50.5, rel=1e-6)
    assert result["total_devido"] == pytest.approx(1050.5, rel=1e-6)


def test_supports_decimal_monthly_rates_and_cent_level_payments():
    result = calculate_loan_interest(
        valor=1000,
        valor_pago=33.33,
        juros_mes=2.5,
        juros_atraso_dia=0,
        juros_pagos=16.67,
        vencimento=utc_date(2026, 5, 8),
        now=utc_date(2026, 5, 8),
    )

    assert result["principal_restante"] == pytest.approx(966.67, rel=1e-6)
    assert result["juros_base"] == pytest.approx(24.16675, rel=1e-6)
    assert result["juros_pendente"] == pytest.approx(7.49675, rel=1e-6)
    assert result["total_devido"] == pytest.approx(974.16675, rel=1e-6)


def test_falls_back_to_created_at_when_there_is_no_due_date():
    result = calculate_loan_interest(
        valor=1000,
        valor_pago=0,
        juros_mes=5,
        juros_atraso_dia=0,
        created_at=utc_date(2026, 5, 8),
        now=utc_date(2026, 5, 8),
    )

    assert result["months_accrued"] == 1
    assert result["juros_pendente"] == 50
    assert result["total_devido"] == 1050


def test_keeps_pending_interest_when_principal_is_paid_but_interest_is_open():
    result = calculate_loan_interest(
        valor=1000,
        valor_pago=1000,
        juros_mes=5,
        juros_atraso_dia=0,
        juros_pagos=25,
        vencimento=utc_date(2026, 5, 8),
        now=utc_date(2026, 5, 8),
    )

    assert result["principal_restante"] == 0
    assert result["juros_pendente"] == 25
    assert result["total_devido"] == 25


def test_does_not_create_interest_when_principal_is_fully_paid_before_due_date():
    result = calculate_loan_interest(
        valor=1000,
        valor_pago=1000,
        juros_mes=5,
        juros_atraso_dia=0,
        juros_pagos=0,
        vencimento=utc_date(2026, 5, 18),
        now=utc_date(2026, 5, 8),
    )

    assert result["principal_restante"] == 0
    assert result["juros_pendente"] == 0
    assert result["total_devido"] == 0
```

### `tests/test_date_utils.py`

```python
from datetime import timezone

from app.domain.date_utils import (
    parse_date_input_to_utc_noon,
    sanitize_digits,
    validate_birth_date_parts,
)


def test_sanitize_digits_respects_max_len():
    assert sanitize_digits("12a3", 2) == "12"
    assert sanitize_digits("00/11", 4) == "0011"


def test_parse_date_input_to_utc_noon_returns_none_for_invalid_values():
    assert parse_date_input_to_utc_noon("") is None
    assert parse_date_input_to_utc_noon("2026-1-01") is None
    assert parse_date_input_to_utc_noon("abcd-ef-gh") is None


def test_parse_date_input_to_utc_noon_is_stable_at_noon_utc():
    result = parse_date_input_to_utc_noon("2026-04-02")

    assert result is not None
    assert result.tzinfo == timezone.utc
    assert result.isoformat().startswith("2026-04-02T12:00:00")


def test_validate_birth_date_parts_requires_all_fields_when_any_is_filled():
    assert validate_birth_date_parts("1", "", "") == {
        "mes": "Mes obrigatorio",
        "ano": "Ano obrigatorio",
    }
    assert validate_birth_date_parts("", "1", "") == {
        "dia": "Dia obrigatorio",
        "ano": "Ano obrigatorio",
    }


def test_validate_birth_date_parts_validates_ranges_and_impossible_dates():
    assert validate_birth_date_parts("00", "01", "2000") == {
        "dia": "Dia invalido (01-31)",
    }
    assert validate_birth_date_parts("31", "13", "2000") == {
        "mes": "Mes invalido (01-12)",
    }
    assert validate_birth_date_parts("31", "02", "2024") == {
        "dia": "Data invalida",
        "mes": "Data invalida",
        "ano": "Data invalida",
    }
```

Observacao: no projeto original as mensagens estao em portugues com acentos. Em Python, pode manter os acentos se o projeto ja usa UTF-8. Caso prefira ASCII, padronize as mensagens sem acento e ajuste os testes.

### `tests/test_client_form.py`

```python
from app.domain.client_form import (
    TAB_REQUIRED_FIELDS,
    format_cep,
    format_cpf,
    format_phone_br,
    normalize_client_payload,
    validate_client_payload,
)


VALID_DATA = {
    "nome": "Joao Silva",
    "indicacao": "",
    "cpf": "529.982.247-25",
    "rg": "",
    "orgao": "",
    "dia_nasc": "10",
    "mes_nasc": "10",
    "ano_nasc": "1990",
    "email": "joao@teste.com",
    "whatsapp": "(11) 91234-5678",
    "instagram": "",
    "cep": "01001-000",
    "endereco": "Rua A",
    "numero_endereco": "123",
    "complemento": "",
    "bairro": "Centro",
    "cidade": "Sao Paulo",
    "estado": "SP",
    "ponto_referencia": "",
    "profissao": "",
    "empresa": "",
    "cep_empresa": "",
    "endereco_empresa": "",
    "cidade_empresa": "",
    "estado_empresa": "",
    "contato_emergencia_1": "",
    "contato_emergencia_2": "",
    "contato_emergencia_3": "",
}


def test_required_fields_by_step():
    assert TAB_REQUIRED_FIELDS["basico"] == ["nome", "whatsapp"]
    assert "cpf" in TAB_REQUIRED_FIELDS["identificacao"]
    assert "cep" in TAB_REQUIRED_FIELDS["endereco"]


def test_applies_masks_automatically():
    assert format_cpf("52998224725") == "529.982.247-25"
    assert format_cep("01001000") == "01001-000"
    assert format_phone_br("11912345678") == "(11) 91234-5678"


def test_validates_realtime_errors_via_schema_or_validator():
    data = {
        **VALID_DATA,
        "cpf": "111.111.111-11",
        "whatsapp": "(11) 9",
    }

    errors = validate_client_payload(data)

    assert "CPF invalido." in errors
    assert "Informe um WhatsApp valido." in errors


def test_normalizes_payload_before_submit():
    payload = normalize_client_payload({
        **VALID_DATA,
        "cep_empresa": "22.222-222",
    })

    assert payload["cpf"] == "52998224725"
    assert payload["whatsapp"] == "11912345678"
    assert payload["cep"] == "01001000"
    assert payload["cep_empresa"] == "22222222"
```

## Mapeamento de nomes TypeScript para Python

Use `snake_case` no Python:

```text
calculateLoanInterest      -> calculate_loan_interest
valorPago                  -> valor_pago
jurosMes                   -> juros_mes
jurosAtrasoDia             -> juros_atraso_dia
jurosPagos                 -> juros_pagos
createdAt                  -> created_at
principalRestante          -> principal_restante
jurosBase                  -> juros_base
jurosAcumuladoTotal        -> juros_acumulado_total
jurosPendente              -> juros_pendente
totalDevido                -> total_devido
monthsAccrued              -> months_accrued
daysLate                   -> days_late
usesDailyLateInterest      -> uses_daily_late_interest
nextMonthInterest          -> next_month_interest
parseDateInputToUTCNoon    -> parse_date_input_to_utc_noon
sanitizeDigits             -> sanitize_digits
validateBirthDateParts     -> validate_birth_date_parts
formatCPF                  -> format_cpf
formatCEP                  -> format_cep
formatPhoneBR              -> format_phone_br
normalizeClientPayload     -> normalize_client_payload
tabRequiredFields          -> TAB_REQUIRED_FIELDS
```

## Como executar

Na raiz do projeto Python:

```bash
pytest
```

Com cobertura:

```bash
pytest --cov=app --cov-report=term-missing
```

Para executar apenas uma area:

```bash
pytest tests/test_loan_interest.py
pytest tests/test_date_utils.py
pytest tests/test_client_form.py
```

## Criterios de aceite

A migracao esta correta quando:

1. Todos os testes passam com `pytest`.
2. Os resultados numericos de juros batem com os valores esperados neste documento.
3. Datas sao calculadas em UTC.
4. Campos de formulario rejeitam os mesmos dados invalidos.
5. Payload normalizado remove mascaras antes de salvar ou enviar para API.
6. Casos de borda continuam cobertos, principalmente vencimento, juros pagos e datas invalidas.

## Prompt recomendado para usar com IA no outro projeto

Use este texto como instrucao inicial para a IA que vai implementar:

```text
Implemente uma suite de testes Python com pytest baseada no documento DOCUMENTACAO_TESTES_PYTHON.md.

Objetivo:
- Criar os arquivos tests/test_loan_interest.py, tests/test_date_utils.py e tests/test_client_form.py.
- Criar ou adaptar as funcoes Python correspondentes em app/domain/.
- Preservar o comportamento dos testes originais do SUPERCOB.
- Usar datas timezone-aware em UTC.
- Usar pytest.approx para comparacoes financeiras com casas decimais.
- Rodar pytest e corrigir a implementacao ate todos os testes passarem.

Nao apenas crie testes superficiais. Os testes precisam chamar funcoes reais da aplicacao.
```

## Observacao sobre o projeto original

No SUPERCOB, a tentativa de executar `pnpm vitest` neste ambiente falhou porque o comando `pnpm` nao esta instalado. Mesmo assim, a estrutura e o conteudo dos testes foram lidos diretamente dos arquivos `.test.ts`, entao este documento reflete os comportamentos testados no codigo atual.
