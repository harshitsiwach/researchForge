"""Calculator — safe mathematical expression evaluation."""

import ast
import math
import operator

TOOL_DEF = {
    "id": "calculator",
    "name": "Calculator",
    "description": "Evaluate mathematical expressions safely. Supports basic arithmetic, exponents, and common math functions (sqrt, log, sin, cos, pi, e).",
    "icon": "🧮",
    "category": "compute",
    "needs_api_key": False,
}

# Safe operators
_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.Mod: operator.mod,
}

_SAFE_NAMES = {
    "pi": math.pi,
    "e": math.e,
    "sqrt": math.sqrt,
    "log": math.log,
    "log10": math.log10,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "abs": abs,
    "round": round,
}


def _safe_eval(node):
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError(f"Unsupported constant: {node.value}")
    elif isinstance(node, ast.BinOp):
        op = _OPS.get(type(node.op))
        if not op:
            raise ValueError(f"Unsupported operator: {type(node.op).__name__}")
        return op(_safe_eval(node.left), _safe_eval(node.right))
    elif isinstance(node, ast.UnaryOp):
        op = _OPS.get(type(node.op))
        if not op:
            raise ValueError(f"Unsupported unary: {type(node.op).__name__}")
        return op(_safe_eval(node.operand))
    elif isinstance(node, ast.Call):
        if isinstance(node.func, ast.Name) and node.func.id in _SAFE_NAMES:
            func = _SAFE_NAMES[node.func.id]
            args = [_safe_eval(a) for a in node.args]
            return func(*args)
        raise ValueError(f"Unsupported function: {ast.dump(node.func)}")
    elif isinstance(node, ast.Name):
        if node.id in _SAFE_NAMES:
            return _SAFE_NAMES[node.id]
        raise ValueError(f"Unknown name: {node.id}")
    else:
        raise ValueError(f"Unsupported expression: {type(node).__name__}")


def execute(query: str, config: dict) -> str:
    try:
        expr = query.strip()
        tree = ast.parse(expr, mode="eval")
        result = _safe_eval(tree.body)
        return f"{expr} = {result}"
    except Exception as e:
        return f"Calculation error: {e}"
