import zipfile
with zipfile.ZipFile('logs.zip', 'r') as zip_ref:
    zip_ref.extractall('logs')
