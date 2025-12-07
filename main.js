function getByGas() {
  const doc = DocumentApp.getActiveDocument();
  Logger.log("Document Name: " + doc.getName());

  const body = doc.getBody();
  const text = body.getText();
  Logger.log("Document Body: " + text);

  // body にある段落を全て取得してプルダウンを探す
  const paragraphs = body.getParagraphs();

  paragraphs.forEach(function (paragraph) {
    Logger.log("Paragraph Text: " + paragraph.getText());
    const numChildren = paragraph.getNumChildren();

    for (let i = 0; i < numChildren; i++) {
      const child = paragraph.getChild(i);
      const childType = child.getType();

      Logger.log("Child " + i + " type: " + childType);

      // 全ての子要素タイプをチェック
      try {
        // UNSUPPORTED タイプ(プルダウンの可能性)
        if (childType === DocumentApp.ElementType.UNSUPPORTED) {
          Logger.log("Found UNSUPPORTED element - likely a dropdown");

          // 利用可能なメソッドを確認
          const methods = [];
          for (let prop in child) {
            if (typeof child[prop] === 'function') {
              methods.push(prop);
            }
          }
          Logger.log("Available methods: " + methods.join(", "));

          // プロトタイプのメソッドも確認
          const protoMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(child));
          Logger.log("Prototype methods: " + protoMethods.join(", "));

          // 異なるアプローチを試す
          try {
            // getType() で詳細を確認
            Logger.log("Element type: " + child.getType());

            // getAttributes() が使えるか試す
            if (typeof child.getAttributes === 'function') {
              const attrs = child.getAttributes();
              Logger.log("Attributes: " + JSON.stringify(attrs));
            }

            // getText() が使えるか試す
            if (typeof child.getText === 'function') {
              Logger.log("Text: " + child.getText());
            }

            // editAsText() が使えるか試す
            if (typeof child.editAsText === 'function') {
              const textElement = child.editAsText();
              Logger.log("As text: " + textElement.getText());
            }
          } catch (e) {
            Logger.log("Error accessing element properties: " + e.toString());
          }
        }
        // Rich Link (プルダウン)の可能性
        else if (childType === DocumentApp.ElementType.RICH_LINK) {
          const richLink = child.asRichLink();
          Logger.log("Found Rich Link: " + richLink.getUrl());
        }
        // テキスト要素
        else if (childType === DocumentApp.ElementType.TEXT) {
          const textElement = child.asText();
          Logger.log("Text content: " + textElement.getText());
        }
      } catch (e) {
        Logger.log("Error processing child " + i + ": " + e.toString());
      }
    }
  });
}
