"""Sphinx configuration for the English manual."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__ + "/..")))

from conf_shared import (  # noqa: E402
    author,
    exclude_patterns,
    extensions,
    html_show_sourcelink,
    html_static_path,
    html_theme,
    project,
    release,
    templates_path,
    version,
)

language = "en"
html_search_language = "en"
html_title = project + " (English)"
