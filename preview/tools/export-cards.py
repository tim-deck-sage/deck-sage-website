"""Export public card metadata only, from the verified immutable preview database."""
import argparse,gzip,hashlib,json,sqlite3,sys
from collections import defaultdict
from pathlib import Path

def encode(value):return json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()
def public_card(row):
 doc=json.loads(row['document']);faces=doc.get('card_faces',[]);images=doc.get('image_uris',{}) or (faces[0].get('image_uris',{}) if faces else {})
 return {'id':row['oracle_id'],'oracleId':row['oracle_id'],'scryfallId':doc.get('id'),'name':row['name'],'manaCost':doc.get('mana_cost') or ' // '.join(f.get('mana_cost','') for f in faces),'cmc':row['cmc'],'typeLine':row['type_line'],'oracleText':row['oracle_text'],'colors':doc.get('colors',[]),'colorIdentity':list(row['color_identity']),'power':doc.get('power'),'toughness':doc.get('toughness'),'loyalty':doc.get('loyalty'),'defense':doc.get('defense'),'keywords':doc.get('keywords',[]),'legalities':doc.get('legalities',{}),'imageUrl':images.get('normal'),'artUrl':images.get('art_crop'),'imageLarge':images.get('large'),'setName':doc.get('set_name'),'setCode':doc.get('set'),'collectorNumber':doc.get('collector_number'),'rarity':row['rarity'],'prices':doc.get('prices',{}) if row['source']=='scryfall-oracle-bulk' else {},'flavorText':doc.get('flavor_text'),'artist':doc.get('artist'),'releasedAt':doc.get('released_at'),'faces':faces,'layout':doc.get('layout'),'scryfallUrl':doc.get('scryfall_uri'),'dataSource':row['source'],'dataNote':doc.get('data_note'),'metadataComplete':row['source']=='scryfall-oracle-bulk','raw':doc}

def main():
 p=argparse.ArgumentParser();p.add_argument('--database',required=True);p.add_argument('--manifest',required=True);args=p.parse_args()
 root=Path(__file__).resolve().parents[1]/'public/card-data';root.mkdir(parents=True,exist_ok=True)
 database=Path(args.database).resolve();c=sqlite3.connect(database.as_uri()+'?mode=ro&immutable=1',uri=True);c.row_factory=sqlite3.Row;c.execute('PRAGMA query_only=ON')
 fields=['oracle_id','name','normalized_name','type_line','oracle_text','color_identity','cmc','rarity','commander_legal','layout','source']
 index=[];shards=defaultdict(dict)
 for row in c.execute('SELECT * FROM web_cards ORDER BY normalized_name,oracle_id'):
  card=public_card(row);index.append([row[k] if k in row.keys() else card['layout'] for k in fields]);shards[row['oracle_id'][:2]][row['oracle_id']]=card
 aliases=[list(row) for row in c.execute('SELECT normalized_alias,oracle_id,confidence FROM offline_card_aliases ORDER BY normalized_alias,confidence DESC,oracle_id')]
 exported={}
 def write(name,value):
  blob=gzip.compress(encode(value),compresslevel=9,mtime=0);(root/name).write_bytes(blob);exported[name]={'bytes':len(blob),'sha256':hashlib.sha256(blob).hexdigest()}
 write('search-index.json.gz',{'fields':fields,'cards':index,'aliases':aliases})
 for shard,cards in sorted(shards.items()):write('cards-'+shard+'.json.gz',cards)
 status=json.loads(Path(args.manifest).read_text(encoding='utf-8'));status.update(mode='browser-local-static',cloudConnected=False,modelInstalled=False,databaseReadOnly=True)
 manifest={'version':1,'cards':len(index),'status':status,'files':exported,'publicDataOnly':True,'schema':'deck-sage-static-v1'}
 (root/'manifest.json').write_bytes(encode(manifest));print(json.dumps({'cards':len(index),'shards':len(shards),'compressedBytes':sum(f['bytes'] for f in exported.values()),'indexBytes':exported['search-index.json.gz']['bytes'],'sourceDatabaseUnchanged':True}))
if __name__=='__main__':main()
