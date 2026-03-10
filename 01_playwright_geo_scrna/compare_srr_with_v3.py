# SRR comparison: v3 vs Playwright. Run in Jupyter or: python compare_srr_with_v3.py
import pandas as pd
import os
BASE = os.path.dirname(os.path.abspath(__file__))
V3_CSV = os.path.join(BASE, 'scRNA_seq_datasets_v3.csv')
PLAYWRIGHT_CSV = os.path.join(BASE, 'output', 'geo_scrna_playwright_srr.csv')
with open(V3_CSV, 'r', encoding='utf-8', errors='replace') as f:
    lines = [l for l in f if l.strip() and not l.startswith('#')]
df_v3 = pd.read_csv(pd.io.common.StringIO(''.join(lines)))
geo_mask = df_v3['Accesion_url'].astype(str).str.contains('ncbi\\.nlm\\.nih\\.gov/geo', na=False)
df_geo = df_v3.loc[geo_mask, ['Accesion', 'Sample_accesion', 'rawdata_name']].copy()
df_geo = df_geo.rename(columns={'Accesion': 'GSE', 'rawdata_name': 'SRR_v3'})
df_geo['SRR_v3'] = df_geo['SRR_v3'].astype(str).str.strip()
df_pw = pd.read_csv(PLAYWRIGHT_CSV)
df_pw['SRR_playwright'] = df_pw['SRR_playwright'].astype(str).str.strip().replace('nan', '')
merged = df_geo.merge(df_pw, on=['GSE', 'Sample_accesion'], how='left')
merged['SRR_playwright'] = merged['SRR_playwright'].fillna('')
def norm(s):
    if pd.isna(s) or s == '' or str(s) == 'nan': return set()
    return set(x.strip() for x in str(s).replace(',', ' ').split() if x.strip().startswith('SRR'))
def cmp_row(r):
    v, p = norm(r['SRR_v3']), norm(r['SRR_playwright'])
    if not v and not p: return 'both_empty'
    if not p: return 'missing_in_playwright'
    if not v: return 'only_in_playwright'
    if v == p: return 'exact_match'
    if v & p: return 'partial_match'
    return 'mismatch'
merged['compare'] = merged.apply(cmp_row, axis=1)

if __name__ == '__main__':
    print('=== GEO 데이터셋 (GSE) ===')
    print(sorted(df_geo['GSE'].unique().tolist()))
    print('\n=== SRR 비교 결과 개수 ===')
    print(merged['compare'].value_counts())
    print('\n=== 샘플 (처음 15행) ===')
    print(merged[['GSE', 'Sample_accesion', 'SRR_v3', 'SRR_playwright', 'compare']].head(15).to_string())
    os.makedirs(os.path.join(BASE, 'output'), exist_ok=True)
    out_path = os.path.join(BASE, 'output', 'srr_comparison_merged.csv')
    merged.to_csv(out_path, index=False)
    print('\n병합 결과 저장:', out_path)
