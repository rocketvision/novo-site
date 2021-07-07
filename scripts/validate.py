import os
from html.parser import HTMLParser
from pathlib import Path
from enum import Enum, auto
from dataclasses import dataclass
from typing import Dict, List, Tuple, Type

import click

html_exts = {".html", ".htm"}


Attrs = List[Tuple[str, str]]


class IssueKind(Enum):
    BEST_PRACTICE = auto()
    ACCESSIBILITY = auto()
    SYNTAX_ERROR = auto()


@dataclass
class Issue:
    level: IssueKind
    message: str
    line: int


class Checker:
    def __init__(self, processor):
        self.processor = processor

    def reset(self):
        pass

    def visit_start(self, tag: str, attrs: Attrs):
        pass

    def visit_end(self, tag: str):
        pass

    def visit_start_end(self, tag: str, attrs: Attrs):
        self.visit_start(tag, attrs)
        self.visit_end(tag)

    def add_issue(self, kind: IssueKind, message: str):
        line = self._current_line()
        issue = Issue(level=kind, message=message, line=line)
        self.processor.issues.append(issue)
        self.processor.total += 1

    def _current_line(self) -> int:
        return self.processor.getpos()[1]


class ElementStackChecker(Checker):
    must_not_close = {"img", "input", "br", "link", "meta"}

    def reset(self):
        self.stack = []
        self.bad_stack = False

    def visit_start(self, tag: str, attrs: Attrs):
        if tag in self.must_not_close:
            return
        self.stack.append(tag)

    def visit_end(self, tag: str):
        if tag in self.must_not_close:
            self.add_issue(IssueKind.SYNTAX_ERROR, f"{tag}: Não feche esse elemento.")
            return
        if self.bad_stack:
            return
        if not self.stack:
            self.add_issue(
                IssueKind.SYNTAX_ERROR,
                f"{tag}: Você fechou esse elemento sem abri-lo antes.",
            )
            self.bad_stack = True
            return
        expected = self.stack[-1]
        if tag != expected:
            self.add_issue(
                IssueKind.SYNTAX_ERROR,
                f"{tag}: Você deveria ter fechado um {expected}.",
            )
            self.bad_stack = True
            return
        self.stack.pop()

    def finalize(self):
        if not self.bad_stack:
            return
        print("ATENÇÃO: Durante a análise, um ou mais elementos foram")
        print("fechados incorretamente. Como não é possível continuar a")
        print("análise da pilha de elementos depois disso, o validate.py")
        print("ignora quaisquer outros erros de fechamento no mesmo")
        print("arquivo. Você deve rodar o script novamente depois de")
        print("corrigir o primeiro erro desse tipo, e assim em diante,")
        print("para cada arquivo com erros de fechamento.")


class DuplicateAttrChecker(Checker):
    def visit_start(self, tag: str, attrs: Attrs):
        known = {}
        for key, val in attrs:
            if old := known.get(key):
                if val == old:
                    kind = "mesmo valor"
                else:
                    kind = "valores diferentes"
                self.add_issue(
                    IssueKind.SYNTAX_ERROR,
                    f"{tag}: Atributo duplicado {key} ({kind}).",
                )
            else:
                known[key] = val


class InlineStylesChecker(Checker):
    def visit_start(self, tag: str, attrs: Attrs):
        for key, val in attrs:
            if key != "style":
                continue
            self.add_issue(
                IssueKind.BEST_PRACTICE,
                f"{tag}: Evite estilização inline.",
            )
            if val:
                continue
            self.add_issue(IssueKind.BEST_PRACTICE, f"{tag}: Não use estilos vazios.")


class ImageAttrChecker(Checker):
    invalid_attr_values = {"..."}
    valid_source_formats = {".webp", ".gif", ".svg"}

    def visit_start(self, tag: str, attrs: Attrs):
        if tag != "img":
            return

        self._require_attrs(tag, attrs, IssueKind.BEST_PRACTICE, "width", "height")
        self._require_attrs(tag, attrs, IssueKind.ACCESSIBILITY, "alt")
        self._check_source(attrs)

    def _require_attrs(self, tag: str, attrs: Attrs, level: IssueKind, *required: str):
        for req in required:
            for key, val in attrs:
                if key == req and val not in self.invalid_attr_values:
                    break
            else:
                self.add_issue(level, f"{tag}: Defina o atributo {req}.")

    def _check_source(self, attrs: Attrs):
        for key, val in attrs:
            if key != "src":
                continue
            _, ext = os.path.splitext(val)
            if ext not in self.valid_source_formats:
                self.add_issue(
                    IssueKind.BEST_PRACTICE,
                    f"img: Prefira imagens WebP, GIF ou SVG em vez de {ext}.",
                )
            return


class LinkAttrChecker(Checker):
    invalid_href_values = {"#", "javascript:void(0)", "javascript:void(0);"}

    def visit_start(self, tag: str, attrs: Attrs):
        if tag != "a":
            return

        for key, val in attrs:
            if key != "href":
                continue
            if val in self.invalid_href_values:
                self.add_issue(
                    IssueKind.ACCESSIBILITY,
                    "a: O atributo href deve conter uma URL válida.",
                )
            # return


# TODO: prevent multiple top level elements in most cases
class Processor(HTMLParser):
    def __init__(self):
        self.checkers: List[Checker] = []
        self.issues: List[Issue] = []
        self.summary: Dict[str, int] = {}
        self.total = 0

        super().__init__()

    def check(self, name: str, input: str):
        self.issues.clear()
        for checker in self.checkers:
            checker.reset()

        self.feed(input)
        self.summary[name] = len(self.issues)
        return self.issues

    def handle_starttag(self, tag: str, attrs: Attrs):
        for checker in self.checkers:
            checker.visit_start(tag, attrs)

    def handle_endtag(self, tag: str):
        for checker in self.checkers:
            checker.visit_end(tag)

    def handle_startendtag(self, tag: str, attrs: Attrs):
        for checker in self.checkers:
            checker.visit_start_end(tag, attrs)

    def add_checker(self, checker: Type[Checker]):
        self.checkers.append(checker(self))


# TODO: use a class decorator
processor = Processor()
processor.add_checker(ElementStackChecker)
processor.add_checker(DuplicateAttrChecker)
processor.add_checker(InlineStylesChecker)
processor.add_checker(ImageAttrChecker)
processor.add_checker(LinkAttrChecker)


def process_file(path: Path) -> List[Issue]:
    with open(path) as f:
        try:
            text = f.read()
        except UnicodeDecodeError:
            # print("Conteúdo ilegível:", path)
            return
    return processor.check(path, text)


def accept_file(path: Path) -> bool:
    name = path.name
    if ".ttf" in name or ".woff" in name:
        return False
    if path.suffix not in html_exts:
        return False
    return True


def process_summary() -> int:
    print("Sumário")
    for k, v in sorted(
        processor.summary.items(), key=lambda p: (p[1], p[0]), reverse=True
    ):
        print(f" {k}: {v}")
    print("Total:", processor.total)


def process_single(full: Path, kinds: List[IssueKind]):
    print("Processando:", full)
    issues = process_file(full)
    count = 0

    for issue in issues:
        if issue.level not in kinds:
            continue

        # if issue.level == IssueKind.BEST_PRACTICE:
        #     kind_str = "Melh.s Práticas"
        # elif issue.level == IssueKind.ACCESSIBILITY:
        #     kind_str = "Acessibilidade "
        # elif issue.level == IssueKind.SYNTAX_ERROR:
        #     kind_str = "Erro de Sintaxe"

        print(f" [Linha {issue.line}] {issue.message}")
        count += 1

    print("Total:", count)


def process_tree(path: Path, kinds: List[IssueKind]):
    for root, _, files in os.walk(path):
        for file in files:
            full = Path(root, file)
            if not accept_file(full):
                continue
            process_single(full, kinds)
            print()

    process_summary()
    if processor.total:
        exit(2)


@click.command()
@click.argument("DIR", default=".")
@click.option("-p", "--only-practices", is_flag=True, help="Apenas melhores práticas")
@click.option("-a", "--only-accessibility", is_flag=True, help="Apenas acessibilidade")
@click.option("-s", "--only-syntax", is_flag=True, help="Apenas erros de sintaxe")
@click.option("-P", "--not-practices", is_flag=True, help="Exceto melhores práticas")
@click.option("-A", "--not-accessibility", is_flag=True, help="Exceto acessibilidade")
@click.option("-S", "--not-syntax", is_flag=True, help="Exceto erros de sintaxe")
def main(
    dir,
    only_practices,
    only_accessibility,
    only_syntax,
    not_practices,
    not_accessibility,
    not_syntax,
):
    kinds = [
        IssueKind.BEST_PRACTICE,
        IssueKind.ACCESSIBILITY,
        IssueKind.SYNTAX_ERROR,
    ]
    if only_practices:
        kinds = [IssueKind.BEST_PRACTICE]
    elif only_accessibility:
        kinds = [IssueKind.ACCESSIBILITY]
    elif only_syntax:
        kinds = [IssueKind.SYNTAX_ERROR]
    elif not_practices:
        kinds.remove(IssueKind.BEST_PRACTICE)
    elif not_accessibility:
        kinds.remove(IssueKind.ACCESSIBILITY)
    elif not_syntax:
        kinds.remove(IssueKind.SYNTAX_ERROR)

    if os.path.isfile(dir):
        process_single(Path(dir), kinds)
        return

    process_tree(dir, kinds)


main()
