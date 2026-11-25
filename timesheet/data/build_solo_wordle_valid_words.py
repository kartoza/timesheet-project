"""Builds the list of words the solo Wordle accepts as guesses.

This is a one-off maintenance script, it is not used by the app. The output
is committed as timesheet/data/single_wordle_valid_words.txt. The answers
(single_wordle_answer_words.txt) are not changed by this script.

Needs (outside the project requirements):
  pip install wordfreq
  words_alpha.txt from https://github.com/dwyl/english-words
  an English Hunspell dictionary (en_US.dic), for example
  https://github.com/wooorm/dictionaries/tree/main/dictionaries/en

Usage:
  python build_solo_wordle_valid_words.py words_alpha.txt en_US.dic

A five letter word is accepted when it is
- already in the current list, or an answer, or
- in the dwyl list and not extremely rare (wordfreq score of 1.0 or more), or
- in the Hunspell dictionary in ANY case, so names and nationalities such as
  "Asian", "French" and "Texas" are accepted, with a score of 1.5 or more, or
- one of EXTRA_WORDS below, for modern words the dictionaries don't have.
"""
import os
import sys

from wordfreq import zipf_frequency

HERE = os.path.dirname(os.path.abspath(__file__))
VALID_FILE = os.path.join(HERE, 'single_wordle_valid_words.txt')
ANSWER_FILE = os.path.join(HERE, 'single_wordle_answer_words.txt')

# Only accepted as guesses, never chosen as the word of the day.
EXTRA_WORDS = ['blogs', 'ebook', 'memes', 'ramen']


def read_words(path):
    with open(path) as f:
        return {line.strip().lower() for line in f if line.strip()}


def five_letters(word):
    return len(word) == 5 and word.isascii() and word.isalpha()


def main(dwyl_path, dic_path):
    current = read_words(VALID_FILE) | read_words(ANSWER_FILE)

    dwyl = {w for w in read_words(dwyl_path) if five_letters(w)}
    common = {w for w in dwyl if zipf_frequency(w, 'en') >= 1.0}

    names = set()
    with open(dic_path, encoding='utf-8', errors='ignore') as f:
        for line in f.read().splitlines()[1:]:
            word = line.split('/')[0]
            if five_letters(word) and zipf_frequency(word.lower(), 'en') >= 1.5:
                names.add(word.lower())

    words = sorted(current | common | names | set(EXTRA_WORDS))
    with open(VALID_FILE, 'w') as f:
        f.write('\n'.join(words) + '\n')
    print(f'{len(words)} words (was {len(current)})')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
