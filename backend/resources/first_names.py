# converting first name database from https://github.com/philipperemy/name-dataset/tree/master

import json

THRESSHOLD = .6
f = open('first_names.json', encoding="utf8") 
data = json.load(f)
f.close()

out = open("first_names.db", "w", encoding="utf8")

for i in data.keys():
    gender = 'U'
    if 'M' in data[i]['gender'] and data[i]['gender']['M'] > THRESSHOLD: gender = 'M'
    if 'F' in data[i]['gender'] and data[i]['gender']['F'] > THRESSHOLD: gender = 'F'
    out.write(i.upper() + ',' + gender + ',,,\n')

out.close()
print('finished', len(data.keys()))