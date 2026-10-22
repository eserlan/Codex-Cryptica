# Generator changes and public copy (#4309)

Changes to the actual output or exposed features of a generator can leave
linked Answer pages and topic hubs describing old behaviour. The previous
heist-generator inconsistency is an example.

The lightweight, non-blocking review report is:

```bash
node scripts/generator-content-impact.mjs --base origin/staging
node scripts/generator-content-impact.mjs --all
```

The staging PR workflow runs this as an **advisory** and publishes the output
in its job summary. Initially, explicit mappings cover **Heist** and
**Point Crawl**; expand this mapping as we validate other generators rather than
guessing from general-purpose engine refactors.

If an output schema, live affordance, generator feature or default changes:

1. Check whether the report lists an Answer, topic hub, example, `/for` page
   or tool page that claims something affected.
2. Compare with actual generator output (not a roadmap or prompt wording).
3. Update any affected public copy, linked worked examples or FAQs.
4. In the PR, leave a brief **"Public copy reviewed"** note, including
   "No changes needed" when that is the correct conclusion.
5. Do not regenerate content automatically, create mandatory new pages, or fail
   the build because of a possible editorial relationship.

Internal refactors need no additional editorial work when shipped behaviour is
unchanged. This is a reminder and a candidate list, not a gate.
