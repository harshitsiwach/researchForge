"""
json_repair — Best-effort JSON repair for LLM outputs.

Local/small models frequently produce almost-valid JSON with common issues:
  - Trailing commas before } or ]
  - Single-quoted strings instead of double-quoted
  - Unquoted keys
  - Missing commas between elements
  - JavaScript-style comments
  - Newlines inside strings
  - Markdown code fences around JSON

This module attempts to fix these issues before parsing.
"""

import json
import re


def repair_json(raw: str) -> str:
    """Attempt to repair common JSON issues produced by LLMs.
    
    Returns the repaired string (still needs json.loads).
    """
    text = raw.strip()

    # 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
    text = re.sub(r'^```(?:json)?\s*\n?', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n?```\s*$', '', text, flags=re.MULTILINE)
    text = text.strip()

    # 2. Remove JavaScript-style single-line comments  // ...
    text = re.sub(r'//[^\n]*', '', text)

    # 3. Remove JavaScript-style block comments  /* ... */
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)

    # 4. Replace single quotes with double quotes (careful with apostrophes)
    # Only do this if the text doesn't already use double quotes for strings
    if text.count("'") > text.count('"'):
        text = _replace_single_quotes(text)

    # 5. Fix trailing commas: ,] or ,}
    text = re.sub(r',\s*([\]}])', r'\1', text)

    # 6. Fix missing commas between } { or ] [ or "value" "key"
    text = re.sub(r'(\})\s*(\{)', r'\1, \2', text)
    text = re.sub(r'(\])\s*(\[)', r'\1, \2', text)
    text = re.sub(r'(")\s*\n\s*(")', r'\1,\n\2', text)

    # 7. Fix missing commas after values before next key
    # Pattern: "value"\n"key": -> "value",\n"key":
    text = re.sub(r'("(?:[^"\\]|\\.)*")\s*\n(\s*"(?:[^"\\]|\\.)*"\s*:)', r'\1,\n\2', text)

    # 8. Fix missing commas after numbers/booleans/null before next key
    text = re.sub(r'(\d+\.?\d*|true|false|null)\s*\n(\s*")', r'\1,\n\2', text)

    # 9. Fix missing commas after closing brackets before next key
    text = re.sub(r'([\]}])\s*\n(\s*"(?:[^"\\]|\\.)*"\s*:)', r'\1,\n\2', text)

    # 10. Ensure unquoted keys get quoted (common: {key: "value"})
    text = re.sub(r'(?<=[{,])\s*([a-zA-Z_]\w*)\s*:', r' "\1":', text)

    # 11. Remove control characters that break JSON (except \n, \t)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)

    return text


def _replace_single_quotes(text: str) -> str:
    """Replace single-quoted strings with double-quoted strings."""
    result = []
    i = 0
    while i < len(text):
        if text[i] == "'":
            # Find matching close quote
            j = i + 1
            while j < len(text) and text[j] != "'":
                if text[j] == '\\':
                    j += 1  # skip escaped char
                j += 1
            if j < len(text):
                # Extract content, escape any double quotes inside
                content = text[i+1:j].replace('"', '\\"')
                result.append(f'"{content}"')
                i = j + 1
            else:
                result.append(text[i])
                i += 1
        else:
            result.append(text[i])
            i += 1
    return ''.join(result)


def safe_parse_json(raw: str, fallback=None):
    """Parse JSON with automatic repair. Returns fallback on total failure.
    
    Args:
        raw: The raw string from the LLM.
        fallback: Value to return if all parsing attempts fail.
    
    Returns:
        Parsed JSON object, or fallback.
    """
    if not raw or not raw.strip():
        return fallback

    # Attempt 1: Direct parse
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        pass

    # Attempt 2: Extract JSON block and parse
    stripped = raw.strip()
    # Find the outermost JSON structure
    first_brace = stripped.find('{')
    first_bracket = stripped.find('[')

    if first_brace >= 0 and (first_bracket < 0 or first_brace < first_bracket):
        # Object
        end = stripped.rfind('}') + 1
        if end > first_brace:
            try:
                return json.loads(stripped[first_brace:end])
            except (json.JSONDecodeError, ValueError):
                pass
    elif first_bracket >= 0:
        # Array
        end = stripped.rfind(']') + 1
        if end > first_bracket:
            try:
                return json.loads(stripped[first_bracket:end])
            except (json.JSONDecodeError, ValueError):
                pass

    # Attempt 3: Repair and parse
    repaired = repair_json(raw)
    try:
        return json.loads(repaired)
    except (json.JSONDecodeError, ValueError):
        pass

    # Attempt 4: Extract from repaired text
    first_brace = repaired.find('{')
    first_bracket = repaired.find('[')

    if first_brace >= 0 and (first_bracket < 0 or first_brace < first_bracket):
        end = repaired.rfind('}') + 1
        if end > first_brace:
            try:
                return json.loads(repaired[first_brace:end])
            except (json.JSONDecodeError, ValueError):
                pass
    elif first_bracket >= 0:
        end = repaired.rfind(']') + 1
        if end > first_bracket:
            try:
                return json.loads(repaired[first_bracket:end])
            except (json.JSONDecodeError, ValueError):
                pass

    # All attempts failed
    return fallback
