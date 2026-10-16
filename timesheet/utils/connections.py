import csv
import io
import re

GROUP_COUNT = 4
GROUP_SIZE = 4
WORD_PATTERN = re.compile(r'^[A-Z]{2,12}$')


def clean_groups(groups):
    """Normalise and validate puzzle groups.

    Returns the groups with upper-cased words. Raises ValueError with a
    readable message if the puzzle is not playable.
    """
    if not isinstance(groups, list) or len(groups) != GROUP_COUNT:
        raise ValueError(f'A puzzle needs exactly {GROUP_COUNT} groups.')
    cleaned = []
    seen = set()
    for group in groups:
        category = str(group.get('category', '')).strip()
        words = [str(w).strip().upper() for w in group.get('words', [])]
        if not category:
            raise ValueError('Every group needs a category.')
        if len(words) != GROUP_SIZE:
            raise ValueError(
                f'"{category}" needs exactly {GROUP_SIZE} words.')
        for word in words:
            if not WORD_PATTERN.match(word):
                raise ValueError(
                    f'"{word}" must be a single word of 2-12 letters.')
            if word in seen:
                raise ValueError(f'"{word}" appears more than once.')
            seen.add(word)
        cleaned.append({'category': category, 'words': words})
    return cleaned


# CSV format: one puzzle per row, four groups from easiest to hardest. The
# four words of a group are separated by "|".
CSV_COLUMNS = [
    column
    for i in range(1, GROUP_COUNT + 1)
    for column in (f'category_{i}', f'words_{i}')
]
CSV_WORD_SEPARATOR = '|'


def parse_puzzles_csv(text):
    """Parse CSV text into puzzles.

    Returns (puzzles, errors). puzzles is a list of (row_number, groups) with
    validated groups; errors is a list of readable messages for the rows (or
    the file) that could not be used. Row 1 is the header, so the first
    puzzle is row 2.
    """
    reader = csv.DictReader(io.StringIO(text.lstrip('\ufeff')))
    missing = [c for c in CSV_COLUMNS if c not in (reader.fieldnames or [])]
    if missing:
        return [], [f'Missing column(s): {", ".join(missing)}.']

    puzzles = []
    errors = []
    seen = {}
    for row_number, row in enumerate(reader, start=2):
        if not any((value or '').strip() for value in row.values()):
            continue
        groups = [
            {
                'category': row[f'category_{i}'] or '',
                'words': [
                    w for w in (row[f'words_{i}'] or '').split(
                        CSV_WORD_SEPARATOR
                    ) if w.strip()
                ],
            } for i in range(1, GROUP_COUNT + 1)
        ]
        try:
            groups = clean_groups(groups)
        except ValueError as error:
            errors.append(f'Row {row_number}: {error}')
            continue
        key = puzzle_key(groups)
        if key in seen:
            errors.append(
                f'Row {row_number}: same words as row {seen[key]}.')
            continue
        seen[key] = row_number
        puzzles.append((row_number, groups))
    return puzzles, errors


def puzzle_key(groups):
    """Identifies a puzzle by its words, ignoring order and categories."""
    return frozenset(w for group in groups for w in group['words'])


def puzzles_to_csv(groups_list):
    output = io.StringIO()
    writer = csv.writer(output, lineterminator='\n')
    writer.writerow(CSV_COLUMNS)
    for groups in groups_list:
        row = []
        for group in groups:
            row += [group['category'], CSV_WORD_SEPARATOR.join(group['words'])]
        writer.writerow(row)
    return output.getvalue()
