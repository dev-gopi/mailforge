"""Focused Final Cleanup tests. stdlib only; no MailForge import graph changes."""
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
import json

SCRIPT = Path(__file__).resolve().parents[2] / 'scripts/final-cleanup-audit.py'
spec = importlib.util.spec_from_file_location('mailforge_final_cleanup_audit', SCRIPT)
auditmod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auditmod)

class FinalCleanupAuditTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root/'packages/template/src').mkdir(parents=True)
        (self.root/'packages/core/src').mkdir(parents=True)
        (self.root/'docs').mkdir()
        (self.root/'.github/workflows').mkdir(parents=True)
        (self.root/'package.json').write_text(json.dumps({'private':True,'packageManager':'pnpm@10.34.7'}))
        (self.root/'.gitignore').write_text('node_modules/\ndist/\ncoverage/\ngenerated/\n')
        (self.root/'docs/RELEASING.md').write_text('ok')
        (self.root/'docs/README.md').write_text('ok')
        (self.root/'.github/workflows/ci.yml').write_text('name: CI')
        (self.root/'packages/template/package.json').write_text(json.dumps({
          'name':'@mailforge/templates','private':True,'version':'0.1.0',
          'dependencies':{'@mailforge/core':'workspace:*'},
          'exports':{'.':{'types':'./dist/index.d.ts','import':'./dist/index.js'}}}))
        (self.root/'packages/core/package.json').write_text(json.dumps({'name':'@mailforge/core','version':'0.1.0','private':True}))
    def test_valid_package_dependency_and_private_release_blocker(self):
        r = auditmod.audit(self.root,tracked=[])
        self.assertEqual(r['errors'],[])
        self.assertEqual(len(r['publicationBlockers']),2)
    def test_unknown_package_dependency_detected(self):
        p = self.root/'packages/template/package.json'
        d=json.loads(p.read_text()); d['dependencies']['@mailforge/ghost']='workspace:*'; p.write_text(json.dumps(d))
        r=auditmod.audit(self.root,tracked=[])
        self.assertTrue(any('unknown workspace package' in x for x in r['errors']))
    def test_tracked_secrets_flagged(self):
        (self.root/'.env.production').write_text('EXAMPLE=unused')
        r=auditmod.audit(self.root,tracked=['.env.production'])
        self.assertTrue(any('tracked env' in x for x in r['errors']))
    def test_workspace_dependency_not_reported_as_orphan(self):
        files=['packages/template/src/index.ts','packages/template/src/Helper.ts']
        (self.root/files[0]).write_text('export { x } from "./Helper.js";')
        (self.root/files[1]).write_text('export const x = 123;')
        r=auditmod.audit(self.root,tracked=files)
        self.assertNotIn(files[1],r['unreferencedSourceHeuristics'])
    def test_duplicate_files_report_only(self):
        files=['packages/core/src/a.ts','packages/core/src/b.ts']
        for f in files: (self.root/f).write_text('export function foo() { return "'+('x'*110)+'" }\n')
        r=auditmod.audit(self.root,tracked=files)
        self.assertIn(sorted(files),r['identicalSourceGroups'])
        self.assertTrue(all((self.root/f).exists() for f in files))
    def test_report_is_markdown(self):
        r=auditmod.audit(self.root,tracked=[])
        md=auditmod.as_markdown(r)
        self.assertIn('# MailForge final repository audit',md)
        self.assertIn('No files are deleted',r['deletionPolicy'])
    def test_reject_renamed_template_package(self):
        (self.root/'packages/templates').mkdir()
        r=auditmod.audit(self.root,tracked=[])
        self.assertTrue(any('packages/templates' in x for x in r['errors']))
    def test_no_automatic_export_file_misclassification(self):
        (self.root/'packages/template/src/index.ts').write_text('export * from "./Template.js";')
        (self.root/'packages/template/src/Template.ts').write_text('export const t = true;')
        r=auditmod.audit(self.root,tracked=['packages/template/src/index.ts','packages/template/src/Template.ts'])
        self.assertEqual(r['unreferencedSourceHeuristics'],[])

if __name__=='__main__': unittest.main()
