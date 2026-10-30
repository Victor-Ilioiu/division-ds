import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './CodeBlock.meta'
import { Example } from '../../docs/Example'
import { CodeBlock } from './CodeBlock'

export function CodeBlockDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="A command" className="block">
        <CodeBlock title="bash" label="the check command" code="npx division-ds check src" className="max-w-3xl" />
      </Example>

      <Example caption="A file, with CSS colours and line numbers" className="block">
        <CodeBlock
          title="index.css"
          language="css"
          label="the theme CSS"
          className="max-w-3xl"
          code={'@import "./division-ds/styles/division-ds.css";\n\n/* Square corners */\n:root {\n  --shape-bevel: 0;\n  --shape-radius: 4px;\n}\n'}
        />
      </Example>

      <Example caption="Not copyable, for code nobody should paste" className="block">
        <CodeBlock title="Wrong" label="a bare pre" copyable={false} code={'<pre>{command}</pre>'} className="max-w-3xl" />
      </Example>
    </ComponentDocs>
  )
}
