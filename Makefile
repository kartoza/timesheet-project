PYTHON  := venv/bin/python
PIP     := venv/bin/pip
BANDIT  := venv/bin/bandit
AUDIT   := venv/bin/pip-audit

.DEFAULT_GOAL := help

.PHONY: help install-dev test security security-code security-deps security-django security-frontend

help:
	@echo ""
	@echo "  install-dev       Install dev + security dependencies"
	@echo "  test              Run Django test suite"
	@echo ""
	@echo "  security          Run all security checks"
	@echo "  security-code     Bandit static analysis on Python source"
	@echo "  security-deps     pip-audit — check for vulnerable packages"
	@echo "  security-django   Django deploy checks (settings, middleware, headers)"
	@echo "  security-frontend npm audit — check for vulnerable JS packages"
	@echo ""

# ── Setup ─────────────────────────────────────────────────────────────────────

install-dev:
	$(PIP) install -r requirements-dev.txt

# ── Tests ─────────────────────────────────────────────────────────────────────

test:
	$(PYTHON) manage.py test

# ── Security ──────────────────────────────────────────────────────────────────

security: security-code security-deps security-django security-frontend

security-code:
	@echo "\n── Bandit (static analysis) ──────────────────────────────────────"
	$(BANDIT) -r . \
		--exclude ./venv,./dashboard/node_modules \
		-ll \
		--format txt

security-deps:
	@echo "\n── pip-audit (dependency vulnerabilities) ────────────────────────"
	$(AUDIT)

security-django:
	@echo "\n── Django deploy checks ──────────────────────────────────────────"
	$(PYTHON) manage.py check --deploy --settings=core.settings.prod 2>&1 || true

security-frontend:
	@echo "\n── npm audit (JS dependency vulnerabilities) ─────────────────────"
	cd dashboard && npm audit --audit-level=moderate
