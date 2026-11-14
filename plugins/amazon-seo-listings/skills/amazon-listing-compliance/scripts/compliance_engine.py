import json, csv, re
from pathlib import Path
from difflib import SequenceMatcher

BASE = Path(__file__).resolve().parent
MASTER = json.loads((BASE / 'master_database.json').read_text(encoding='utf-8'))
SEM = json.loads((BASE / 'semantic_dictionary.json').read_text(encoding='utf-8'))
RECORDS = MASTER['records']

class AmazonComplianceEngine:
    def __init__(self):
        self.records = RECORDS
        self.semantic_entries = SEM['entries']

    def _norm(self, text):
        return re.sub(r'\s+', ' ', text or '').strip().lower()

    def _find_exact(self, text):
        hits = []
        norm = self._norm(text)
        for rec in self.records:
            phrase = self._norm(rec.get('restricted_phrase',''))
            if phrase and phrase in norm:
                hits.append((rec, 0.99, 'exact'))
        return hits

    def _find_semantic(self, text):
        hits = []
        norm = self._norm(text)
        for rec in self.records:
            candidates = [rec.get('restricted_phrase','')] + rec.get('variations',[])
            candidates = [self._norm(c) for c in candidates if c]
            best = 0.0
            best_phrase = None
            for c in candidates:
                if not c:
                    continue
                if c in norm:
                    best = 0.95
                    best_phrase = c
                    break
                ratio = SequenceMatcher(None, c, norm).ratio()
                if ratio > best:
                    best = ratio
                    best_phrase = c
            if best >= 0.72 and best_phrase:
                hits.append((rec, round(best, 2), 'semantic'))
        return hits

    def scan_text_fields(self, fields):
        results = []
        for location, text in fields.items():
            if not text:
                continue
            seen = set()
            for rec, score, mode in self._find_exact(text) + self._find_semantic(text):
                key = (location, rec['id'])
                if key in seen:
                    continue
                seen.add(key)
                results.append({
                    'id': rec['id'],
                    'location': location,
                    'category': rec['category'],
                    'detected_text': rec.get('restricted_phrase') or text[:120],
                    'severity': rec['severity'],
                    'reason': rec['reason'],
                    'policy_reference': rec['policy_reference'],
                    'confidence_score': score,
                    'match_type': mode,
                    'suggested_alternative': (rec.get('acceptable_alternatives') or [''])[0]
                })
        return self._score(results)

    def _score(self, results):
        weights = {'Critical': 12, 'High': 7, 'Medium': 4, 'Low': 2}
        penalty = sum(weights.get(r['severity'], 4) for r in results)
        score = max(0, 100 - penalty)
        if score >= 90:
            risk = 'Low'
        elif score >= 75:
            risk = 'Medium'
        elif score >= 50:
            risk = 'High'
        else:
            risk = 'Critical'
        counts = {}
        for r in results:
            counts[r['category']] = counts.get(r['category'], 0) + 1
        return {
            'compliance_score': score,
            'overall_risk': risk,
            'counts_by_category': counts,
            'violations': results
        }

if __name__ == '__main__':
    engine = AmazonComplianceEngine()
    sample = {
        'title': 'Doctor Recommended Acne Cream That Cures Breakouts Fast',
        'bullets': 'FDA Approved formula. Guaranteed results. Works instantly.'
    }
    import json
    print(json.dumps(engine.scan_text_fields(sample), indent=2))
