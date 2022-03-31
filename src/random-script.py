#!/usr/bin/env python3

import sys
import random
import datetime
import time


def main(seed):
    dup = dict()
    random.seed(seed + str(datetime.datetime.utcnow()))
    while True:
        digit = random.randint(0, 9)
        if digit in dup:
            break
        dup[digit] = True
    return digit


if __name__ == "__main__":
    try:
        print(main(*sys.argv[1:]))
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)