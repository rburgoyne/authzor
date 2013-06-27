#!/usr/bin/python

"""
This file contains methods that are shared by multiple Authzor scripts.
"""

import json

CONFIG_LOCATION = '../authzor.conf'

def read_config():
    """Read configuration file and return a settings object."""
    try:
        config_file = open(CONFIG_LOCATION)
    except IOError:
        print_error('Could not open the configuration file.')
        raise
    try:
        settings = json.loads(config_file.read())
    except ValueError:
        print_error('Could not parse the configuration file.')
        raise
    return settings


def print_error(error):
    """Print out an error string as a JSON object."""
    print json.dumps({'error': error})
