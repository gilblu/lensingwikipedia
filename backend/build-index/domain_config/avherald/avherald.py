"""
Extracting data to index from Json data for The Aviation Herald.
"""

import json

facet_field_names = ['title', 'url', 'sentence', 'sentenceSpan', 'event', 'eventSpan', 'descriptionReplacements', 'location', 'airport', 'currentcountry', 'organization', 'person', 'category']
description_field_names = ['title', 'url', 'sentence', 'sentenceSpan', 'description', 'descriptionReplacements', 'sentence', 'id', 'predicate', 'event', 'eventSpan', 'year']

field_name_aliases = {}.get

def format_replacement(replacements):
  keep_keys = ['span', 'url']
  return json.dumps(dict((t, dict((k, v) for (k, v) in r.iteritems() if k in keep_keys)) for (t, r) in replacements.iteritems()))

def get_points(event):
  """
  Get all geographical points for an event.
  """

  def points_from(items):
    return set((float(i['longitude']), float(i['latitude'])) for i in items.itervalues() if 'latitude' in i and 'longitude' in i)
  points = set()
  if 'wiki_info' in event:
    points |= points_from(event['wiki_info'])
  if 'locations' in event:
    points |= points_from(event['locations'])
  return points

def get_required_field_values(num_role_arguments):
  """
  Get values for the required field values. Parameterized on the number of role arguments.
  """

  def get(event):
    points = get_points(event)
    values = {
      'year': int(event['year']),
      'predicate': event['eventRoot'],
      'description': event['description'],
      'allPoints': ["%f,%f" % p for p in points]
    }
    all_arguments = []
    all_roles = []
    for id in range(num_role_arguments):
      key = 'A%i' % (id)
      if key in event:
        values['A%i' % (id)] = event[key][1]
        all_arguments.append(event[key][1])
      key = 'roleA%i' % (id)
      if key in event:
        values['roleA%i' % (id)] = event[key]
        all_roles.append(event[key])
    values['argument'] = all_arguments
    values['role'] = all_roles
    return values

  return get

def get_facet_field_values(event):
  """
  Get values for the extra keyword field values.
  """

  locationLocation = set(v['title'] for v in event['locations'].itervalues()) if 'locations' in event else set()
  wikiInfoLocation = set(v['title'] for v in event['wiki_info'].itervalues() if 'latitude' in v and 'longitude' in v) if 'wiki_info' in event else set()
  airport = set(v['title'] for v in event['airport'].itervalues()) if 'airport' in event else set()
  values = {
    'title': event['title'],
    'url': event['url'],
    'sentence': event['sentence']['text'],
    'sentenceSpan': [str(i) for i in event['sentence']['span']],
    'event': event['event'][1],
    'eventSpan': [str(i) for i in event['event'][0]],
    'descriptionReplacements': format_replacement(event['wiki_info']),
    'location': locationLocation | wikiInfoLocation | airport,
    'airport': airport,
    'currentcountry': [v['country'] for (k, v) in event['locations'].iteritems() if 'country' in v] if 'locations' in event else [],
    'organization': [v['title'] for v in event['organization'].itervalues()] if 'organization' in event else [],
    'person': [v['title'] for v in event['person'].itervalues()] if 'person' in event else [],
    'category': [c for v in (event['wiki_info'].itervalues() if 'wiki_info' else []) if 'category' in v for c in v['category']]
  }
  return values
