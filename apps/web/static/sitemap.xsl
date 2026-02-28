<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap | Codex Cryptica</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body {
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 13px;
            color: #e4e4e7;
            background-color: #09090b;
            margin: 0;
            padding: 40px;
          }
          a {
            color: #3b82f6;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .header {
            margin-bottom: 40px;
            border-bottom: 1px solid #27272a;
            padding-bottom: 20px;
          }
          h1 {
            color: #3b82f6;
            font-size: 24px;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            margin: 0 0 10px 0;
          }
          p {
            color: #a1a1aa;
            margin: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            text-align: left;
            padding: 12px;
            border-bottom: 2px solid #27272a;
            color: #f4f4f5;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #18181b;
          }
          tbody tr:hover {
            background-color: #18181b;
          }
          .priority {
            font-weight: bold;
            color: #10b981;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Codex Cryptica Sitemap</h1>
          <p>Index of public-facing routes for Codex Cryptica.</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th>Priority</th>
              <th>Change Freq</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="sitemap:urlset/sitemap:url">
              <tr>
                <td>
                  <xsl:variable name="itemURL">
                    <xsl:value-of select="sitemap:loc"/>
                  </xsl:variable>
                  <a href="{$itemURL}">
                    <xsl:value-of select="sitemap:loc"/>
                  </a>
                </td>
                <td class="priority">
                  <xsl:value-of select="concat(sitemap:priority*100, '%')"/>
                </td>
                <td>
                  <xsl:value-of select="sitemap:changefreq"/>
                </td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
