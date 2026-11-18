"""Shared Sphinx settings for the English and Brazilian Portuguese trees.

Each language has a tiny ``conf.py`` that sets its own ``language`` and
imports everything else from here, so both manuals always render with the
same project name, version, theme and options.
"""

import json
import os

DOCS_DIR = os.path.dirname(os.path.abspath(__file__))
PACKAGE_JSON = os.path.join(DOCS_DIR, "..", "package.json")


def app_version() -> str:
    """Read the app version from package.json (falls back to 0.0.0)."""
    try:
        with open(PACKAGE_JSON, encoding="utf-8") as handle:
            return str(json.load(handle).get("version", "0.0.0"))
    except OSError:
        return "0.0.0"


project = "Gnumaru's Painting and Animation App Manual"
author = "Gnumaru"
version = app_version()
release = version

extensions: list[str] = []

templates_path = ["_templates"]
exclude_patterns: list[str] = ["_build", "Thumbs.db", ".DS_Store"]

html_theme = "sphinx_rtd_theme"
html_static_path = ["_static"]
html_show_sourcelink = False
