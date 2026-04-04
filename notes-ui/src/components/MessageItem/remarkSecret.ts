/* eslint-disable import/no-extraneous-dependencies */
import {Plugin} from 'unified';
import {visit} from 'unist-util-visit';
import {Root, RootContent, Text} from 'mdast';

const remarkSecret: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      const text = node.value;
      const nodes: RootContent[] = [];
      let lastIndex = 0;
      let i = 0;

      while (i < text.length) {
        if (text[i] === '|' && text[i + 1] === '|') {
          const start = i;
          let content = '';
          let j = i + 2;
          let foundEnd = false;

          while (j < text.length) {
            if (
              text[j] === '\\' &&
              text[j + 1] === '|' &&
              text[j + 2] === '|' &&
              j + 2 < text.length
            ) {
              content += text[j + 1];
              j += 3;
              continue;
            }

            if (text[j] === '|' && text[j + 1] === '|') {
              foundEnd = true;
              break;
            }

            content += text[j];
            j++;
          }

          if (foundEnd) {
            if (start > lastIndex) {
              nodes.push({type: 'text', value: text.slice(lastIndex, start)});
            }

            nodes.push({
              type: 'text',
              value: content,
              data: {
                hName: 'span',
                hProperties: {className: 'secret-spoiler', 'data-secret': content},
              },
            });

            i = j + 2;
            lastIndex = i;
            continue;
          }
        }
        i++;
      }

      if (lastIndex < text.length) {
        nodes.push({type: 'text', value: text.slice(lastIndex)});
      }

      if (nodes.length > 0 && lastIndex > 0) {
        parent.children.splice(index, 1, ...nodes);
      }
    });
  };
};

export default remarkSecret;
