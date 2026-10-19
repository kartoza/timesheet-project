import os

MIN_WORD_LENGTH = 7
MAX_WORD_LENGTH = 9

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')


def _load(filename):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return sorted({line.strip().upper() for line in f if line.strip()})


# Common words that can be picked as the word of a round.
WORDLE_WORDS = _load('wordle_answer_words.txt')

# Every accepted guess; always a superset of WORDLE_WORDS.
VALID_GUESSES = frozenset(_load('wordle_valid_words.txt')) | frozenset(WORDLE_WORDS)


# Single player wordle: common 5 letter words.
SOLO_WORDLE_WORDS = sorted(
    w.upper() for w in _load('single_wordle_answer_words.txt')
)
SOLO_VALID_GUESSES = (
    frozenset(_load('single_wordle_valid_words.txt')) | frozenset(SOLO_WORDLE_WORDS)
)
