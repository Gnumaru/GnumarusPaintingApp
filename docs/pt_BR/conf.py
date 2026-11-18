"""Sphinx configuration for the Brazilian Portuguese manual."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__ + "/..")))

from conf_shared import (  # noqa: E402
    author,
    exclude_patterns,
    extensions,
    html_css_files,
    html_js_files,
    html_show_sourcelink,
    html_static_path,
    html_theme,
    html_theme_options,
    project,
    release,
    templates_path,
    version,
)

language = "pt_BR"
html_search_language = "pt"
html_title = "Manual do Gnumaru's Painting and Animation App (Português)"
