"""
Java Source Code AST Analyzer.

Parses Java source code using javalang AST parser with a resilient
regex fallback for unsupported or modern syntax constructs.
Produces structured JSON adhering strictly to Phase 3 requirements.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

try:
    import javalang
    import javalang.tree as jtree
    _JAVALANG_AVAILABLE = True
except ImportError:
    _JAVALANG_AVAILABLE = False


@dataclass
class MethodParam:
    name: str
    type: str

    def to_dict(self) -> Dict[str, str]:
        return {"name": self.name, "type": self.type}


@dataclass
class MethodInfo:
    name: str
    return_type: str
    parameters: List[str]  # e.g. ["int a", "int b"] or parameter types for backward compat
    visibility: str  # public | protected | private | package
    is_static: bool = False
    is_abstract: bool = False
    throws: List[str] = field(default_factory=list)
    param_details: List[MethodParam] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "visibility": self.visibility,
            "static": self.is_static,
            "return_type": self.return_type,
            "parameters": [p.to_dict() for p in self.param_details],
            "throws": self.throws,
        }


@dataclass
class ConstructorInfo:
    name: str
    visibility: str
    parameters: List[MethodParam] = field(default_factory=list)
    throws: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "visibility": self.visibility,
            "parameters": [p.to_dict() for p in self.parameters],
            "throws": self.throws,
        }


@dataclass
class FieldInfo:
    name: str
    type: str
    visibility: str
    is_static: bool = False
    is_final: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": self.type,
            "visibility": self.visibility,
            "static": self.is_static,
            "final": self.is_final,
        }


@dataclass
class ClassInfo:
    name: str
    type: str  # class | interface | enum | record
    visibility: str  # public | protected | private | package
    constructors: List[ConstructorInfo] = field(default_factory=list)
    fields: List[FieldInfo] = field(default_factory=list)
    methods: List[MethodInfo] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": self.type,
            "visibility": self.visibility,
            "constructors": [c.to_dict() for c in self.constructors],
            "fields": [f.to_dict() for f in self.fields],
            "methods": [m.to_dict() for m in self.methods],
        }


@dataclass
class JavaAnalysis:
    class_name: str
    package: Optional[str]
    imports: List[str]
    methods: List[MethodInfo]
    constructors: List[MethodInfo]
    branch_count: int
    field_count: int
    line_count: int
    analysis_notes: List[str]
    classes: List[ClassInfo] = field(default_factory=list)
    source_id: Optional[str] = None

    def to_dict(self, source_id: Optional[str] = None) -> Dict[str, Any]:
        """Produce structured JSON conforming strictly to Phase 3 specification."""
        total_methods = sum(len(c.methods) for c in self.classes) if self.classes else len(self.methods)
        total_constructors = sum(len(c.constructors) for c in self.classes) if self.classes else len(self.constructors)
        total_fields = sum(len(c.fields) for c in self.classes) if self.classes else self.field_count

        return {
            "source_id": source_id or self.source_id or "",
            "package_name": self.package or "",
            "imports": self.imports,
            "classes": [c.to_dict() for c in self.classes],
            "statistics": {
                "class_count": len(self.classes) if self.classes else (1 if self.class_name != "Unknown" else 0),
                "method_count": total_methods,
                "constructor_count": total_constructors,
                "field_count": total_fields,
                "branch_count": self.branch_count,
                "line_count": self.line_count,
            },
            "analysis_notes": self.analysis_notes,
        }


def _get_visibility(modifiers: set | list) -> str:
    mods = set(modifiers) if modifiers else set()
    if "public" in mods:
        return "public"
    if "protected" in mods:
        return "protected"
    if "private" in mods:
        return "private"
    return "package"


def _format_type(t: Any) -> str:
    if t is None:
        return "void"
    if hasattr(t, "name"):
        base = t.name
        if hasattr(t, "arguments") and t.arguments:
            args = ", ".join(_format_type(a) for a in t.arguments if a)
            return f"{base}<{args}>"
        if hasattr(t, "dimensions") and t.dimensions:
            return f"{base}{'[]' * len(t.dimensions)}"
        return base
    if hasattr(t, "type"):
        return _format_type(t.type)
    return str(t)


def _analyze_with_javalang(source_code: str) -> Optional[JavaAnalysis]:
    """Parse Java source code using javalang AST."""
    if not _JAVALANG_AVAILABLE:
        return None

    try:
        tree = javalang.parse.parse(source_code)
    except Exception:
        # Fall back to regex on any parsing failure
        return None

    package_name = tree.package.name if tree.package else None
    imports = [imp.path for imp in tree.imports] if tree.imports else []
    line_count = len(source_code.splitlines())

    classes_info: List[ClassInfo] = []
    flat_methods: List[MethodInfo] = []
    flat_constructors: List[MethodInfo] = []
    total_fields = 0

    # Count branches in the entire AST
    branch_count = 0
    for _, node in tree:
        if isinstance(node, (
            jtree.IfStatement,
            jtree.WhileStatement,
            jtree.ForStatement,
            jtree.DoStatement,
            jtree.SwitchStatement,
            jtree.CatchClause,
            jtree.TernaryExpression,
        )):
            branch_count += 1

    # Extract class/interface/enum declarations
    types_found = []
    for _, node in tree:
        if isinstance(node, (jtree.ClassDeclaration, jtree.InterfaceDeclaration, jtree.EnumDeclaration)):
            types_found.append(node)

    primary_class_name = "Unknown"

    for node in types_found:
        if isinstance(node, jtree.ClassDeclaration):
            decl_type = "class"
        elif isinstance(node, jtree.InterfaceDeclaration):
            decl_type = "interface"
        elif isinstance(node, jtree.EnumDeclaration):
            decl_type = "enum"
        else:
            decl_type = "class"

        c_visibility = _get_visibility(node.modifiers)
        if primary_class_name == "Unknown" or "public" in (node.modifiers or set()):
            primary_class_name = node.name

        constructors: List[ConstructorInfo] = []
        if hasattr(node, "constructors"):
            for c in node.constructors:
                c_vis = _get_visibility(c.modifiers)
                c_params = [
                    MethodParam(name=p.name, type=_format_type(p.type))
                    for p in (c.parameters or [])
                ]
                c_throws = [th for th in (c.throws or [])]
                constructors.append(ConstructorInfo(
                    name=c.name,
                    visibility=c_vis,
                    parameters=c_params,
                    throws=c_throws,
                ))
                flat_constructors.append(MethodInfo(
                    name=c.name,
                    return_type="void",
                    parameters=[f"{p.type} {p.name}" for p in c_params],
                    visibility=c_vis,
                    is_static=False,
                    throws=c_throws,
                    param_details=c_params,
                ))

        fields_list: List[FieldInfo] = []
        if hasattr(node, "fields"):
            for f in node.fields:
                f_vis = _get_visibility(f.modifiers)
                f_type = _format_type(f.type)
                f_mods = set(f.modifiers or set())
                for d in f.declarators:
                    fields_list.append(FieldInfo(
                        name=d.name,
                        type=f_type,
                        visibility=f_vis,
                        is_static="static" in f_mods,
                        is_final="final" in f_mods,
                    ))
                    total_fields += 1

        methods: List[MethodInfo] = []
        if hasattr(node, "methods"):
            for m in node.methods:
                m_vis = _get_visibility(m.modifiers)
                m_mods = set(m.modifiers or set())
                m_ret = _format_type(m.return_type) if m.return_type else "void"
                m_params = [
                    MethodParam(name=p.name, type=_format_type(p.type))
                    for p in (m.parameters or [])
                ]
                m_throws = [th for th in (m.throws or [])]
                mi = MethodInfo(
                    name=m.name,
                    return_type=m_ret,
                    parameters=[f"{p.type} {p.name}" for p in m_params],
                    visibility=m_vis,
                    is_static="static" in m_mods,
                    is_abstract="abstract" in m_mods,
                    throws=m_throws,
                    param_details=m_params,
                )
                methods.append(mi)
                flat_methods.append(mi)

        classes_info.append(ClassInfo(
            name=node.name,
            type=decl_type,
            visibility=c_visibility,
            constructors=constructors,
            fields=fields_list,
            methods=methods,
        ))

    return JavaAnalysis(
        class_name=primary_class_name,
        package=package_name,
        imports=imports,
        methods=flat_methods,
        constructors=flat_constructors,
        branch_count=branch_count,
        field_count=total_fields,
        line_count=line_count,
        analysis_notes=[f"Parsed with javalang AST engine: {len(classes_info)} classes/types found."],
        classes=classes_info,
    )


# ── Regex Fallback Parser ───────────────────────────────────────────────────

_PACKAGE_RE = re.compile(r'^\s*package\s+([\w.]+)\s*;', re.MULTILINE)
_IMPORT_RE = re.compile(r'^\s*import\s+([\w.*]+)\s*;', re.MULTILINE)
_CLASS_RE = re.compile(
    r'(?P<modifiers>(?:public|protected|private|abstract|final|static)\s+)*'
    r'(?P<type>class|interface|enum|record)\s+(?P<name>\w+)'
    r'(?:\s+extends\s+[\w<>, ]+)?(?:\s+implements\s+[\w<>, ]+)?\s*\{',
    re.MULTILINE,
)
_CONSTRUCTOR_RE = re.compile(
    r'(?P<visibility>public|protected|private)?\s*'
    r'(?P<name>[A-Z]\w*)\s*\((?P<params>[^)]*)\)\s*'
    r'(?:throws\s+(?P<throws>[\w, ]+))?\s*\{',
    re.MULTILINE,
)
_METHOD_RE = re.compile(
    r'(?P<visibility>public|protected|private|)\s*'
    r'(?P<modifiers>(?:static|abstract|final|synchronized|native|default)\s+)*'
    r'(?P<return_type>[\w<>\[\],? ]+?)\s+'
    r'(?P<name>[a-zA-Z_]\w*)\s*'
    r'\((?P<params>[^)]*)\)\s*'
    r'(?:throws\s+(?P<throws>[\w, ]+))?\s*'
    r'(?:\{|;)',
    re.MULTILINE,
)
_FIELD_RE = re.compile(
    r'^\s*(?P<mods>(?:private|protected|public|static|final)\s+)+'
    r'(?P<type>[\w<>\[\],? ]+?)\s+'
    r'(?P<name>\w+)\s*(?:=.*?)?;',
    re.MULTILINE,
)
_BRANCH_RE = re.compile(r'\b(?:if|else if|switch|while|for|do|catch|case)\b', re.MULTILINE)


def _parse_param_details(params_str: str) -> List[MethodParam]:
    params_str = params_str.strip()
    if not params_str:
        return []
    result = []
    # Split by comma outside <...>
    depth = 0
    current = ""
    for ch in params_str:
        if ch in "<([":
            depth += 1
            current += ch
        elif ch in ">)]":
            depth -= 1
            current += ch
        elif ch == "," and depth == 0:
            parts = current.strip().split()
            if len(parts) >= 2:
                p_type = " ".join(parts[:-1])
                p_name = parts[-1]
                result.append(MethodParam(name=p_name, type=p_type))
            elif parts:
                result.append(MethodParam(name=f"arg{len(result)}", type=parts[0]))
            current = ""
        else:
            current += ch
    if current.strip():
        parts = current.strip().split()
        if len(parts) >= 2:
            p_type = " ".join(parts[:-1])
            p_name = parts[-1]
            result.append(MethodParam(name=p_name, type=p_type))
        elif parts:
            result.append(MethodParam(name=f"arg{len(result)}", type=parts[0]))
    return result


def _analyze_with_regex(source_code: str) -> JavaAnalysis:
    """Fallback parser using regex."""
    pkg_match = _PACKAGE_RE.search(source_code)
    package_name = pkg_match.group(1) if pkg_match else None
    imports = _IMPORT_RE.findall(source_code)

    class_matches = list(_CLASS_RE.finditer(source_code))
    primary_class_name = class_matches[0].group("name") if class_matches else "Unknown"

    classes_info: List[ClassInfo] = []
    for cm in class_matches:
        c_name = cm.group("name")
        c_type = cm.group("type")
        c_mods = (cm.group("modifiers") or "").split()
        c_vis = _get_visibility(c_mods)
        classes_info.append(ClassInfo(
            name=c_name,
            type=c_type,
            visibility=c_vis,
        ))

    # Methods
    methods: List[MethodInfo] = []
    for mm in _METHOD_RE.finditer(source_code):
        name = mm.group("name")
        ret_type = mm.group("return_type").strip()
        # Avoid constructors being captured as methods
        if name in [c.name for c in classes_info]:
            continue
        vis = mm.group("visibility").strip() or "package"
        mods = mm.group("modifiers") or ""
        is_static = "static" in mods
        is_abstract = "abstract" in mods
        params = mm.group("params") or ""
        param_details = _parse_param_details(params)
        th = [t.strip() for t in (mm.group("throws") or "").split(",") if t.strip()]

        methods.append(MethodInfo(
            name=name,
            return_type=ret_type,
            parameters=[f"{p.type} {p.name}" for p in param_details],
            visibility=vis,
            is_static=is_static,
            is_abstract=is_abstract,
            throws=th,
            param_details=param_details,
        ))

    # Fields
    fields_list: List[FieldInfo] = []
    for fm in _FIELD_RE.finditer(source_code):
        mods = (fm.group("mods") or "").split()
        fields_list.append(FieldInfo(
            name=fm.group("name"),
            type=fm.group("type").strip(),
            visibility=_get_visibility(mods),
            is_static="static" in mods,
            is_final="final" in mods,
        ))

    # Assign methods and fields to primary class
    if classes_info:
        classes_info[0].methods = methods
        classes_info[0].fields = fields_list

    branch_count = len(_BRANCH_RE.findall(source_code))
    line_count = len(source_code.splitlines())

    return JavaAnalysis(
        class_name=primary_class_name,
        package=package_name,
        imports=imports,
        methods=methods,
        constructors=[],
        branch_count=branch_count,
        field_count=len(fields_list),
        line_count=line_count,
        analysis_notes=["Parsed with fallback structural parser."],
        classes=classes_info,
    )


def analyze_java_source(source_code: str, source_id: Optional[str] = None) -> JavaAnalysis:
    """
    Main entrypoint for Java source analysis.

    Attempts javalang AST parsing first; falls back gracefully to
    structural regex parser if the source code contains newer Java syntax
    or is a fragment.
    """
    if not source_code or not source_code.strip():
        return JavaAnalysis(
            class_name="Unknown",
            package=None,
            imports=[],
            methods=[],
            constructors=[],
            branch_count=0,
            field_count=0,
            line_count=0,
            analysis_notes=["Empty source code provided."],
            classes=[],
            source_id=source_id,
        )

    ast_analysis = _analyze_with_javalang(source_code)
    if ast_analysis is not None:
        ast_analysis.source_id = source_id
        return ast_analysis

    fallback = _analyze_with_regex(source_code)
    fallback.source_id = source_id
    return fallback
