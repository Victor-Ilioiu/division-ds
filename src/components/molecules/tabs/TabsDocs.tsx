import { useState } from 'react'
import { Archive, Inbox, Package, Shield, User } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Tabs.meta'
import { Example } from '../../docs/Example'
import { Button } from '../../atoms'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs'

/** A controlled example: two external Buttons drive the same `value` the tablist does, to show
 *  the value is shared state rather than something the tablist owns privately. */
function ControlledExample() {
  const [value, setValue] = useState('replica')

  return (
    <div className="max-w-sm w-full">
      <div className="flex gap-2 mb-4">
        <Button size="sm" variant="secondary" onClick={() => setValue('replica')}>
          Show replica
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setValue('optics')}>
          Show optics
        </Button>
      </div>
      <Tabs value={value} onValueChange={setValue}>
        <TabsList aria-label="Kit sections">
          <TabsTrigger value="replica">Replica</TabsTrigger>
          <TabsTrigger value="optics">Optics</TabsTrigger>
        </TabsList>
        <TabsContent value="replica">Electric carbine replica.</TabsContent>
        <TabsContent value="optics">Tube sight and holo sight.</TabsContent>
      </Tabs>
    </div>
  )
}

export function TabsDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Default">
        <div className="max-w-sm w-full">
          <Tabs defaultValue="replica">
            <TabsList aria-label="Kit sections">
              <TabsTrigger value="replica">Replica</TabsTrigger>
              <TabsTrigger value="optics">Optics</TabsTrigger>
              <TabsTrigger value="parts">Parts</TabsTrigger>
            </TabsList>
            <TabsContent value="replica">Electric carbine replica.</TabsContent>
            <TabsContent value="optics">Tube sight and holo sight.</TabsContent>
            <TabsContent value="parts">Magazines, a battery and a charger.</TabsContent>
          </Tabs>
        </div>
      </Example>

      <Example caption="With a disabled tab">
        <div className="max-w-sm w-full">
          <Tabs defaultValue="replica">
            <TabsList aria-label="Kit sections">
              <TabsTrigger value="replica">Replica</TabsTrigger>
              <TabsTrigger value="optics">Optics</TabsTrigger>
              <TabsTrigger value="parts" disabled>
                Parts
              </TabsTrigger>
            </TabsList>
            <TabsContent value="replica">Electric carbine replica.</TabsContent>
            <TabsContent value="optics">Tube sight and holo sight.</TabsContent>
            <TabsContent value="parts">Magazines, a battery and a charger.</TabsContent>
          </Tabs>
        </div>
      </Example>

      <Example caption="Line, with icons and counts">
        <div className="max-w-md w-full">
          <Tabs defaultValue="open" variant="line">
            <TabsList aria-label="Orders">
              <TabsTrigger value="open" icon={<Inbox />} count={12}>
                Open
              </TabsTrigger>
              <TabsTrigger value="packed" icon={<Package />} count={4}>
                Packed
              </TabsTrigger>
              <TabsTrigger value="archived" icon={<Archive />} count={0}>
                Archived
              </TabsTrigger>
            </TabsList>
            <TabsContent value="open">Twelve orders waiting to be packed.</TabsContent>
            <TabsContent value="packed">Four orders packed, waiting for the courier.</TabsContent>
            <TabsContent value="archived">No archived orders yet.</TabsContent>
          </Tabs>
        </div>
      </Example>

      <Example caption="Vertical, line">
        <div className="max-w-md w-full">
          <Tabs defaultValue="profile" orientation="vertical" variant="line">
            <TabsList aria-label="Settings">
              <TabsTrigger value="profile" icon={<User />}>
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" icon={<Shield />}>
                Security
              </TabsTrigger>
            </TabsList>
            <TabsContent value="profile">Callsign, squad and home field.</TabsContent>
            <TabsContent value="security">Password and signed-in devices.</TabsContent>
          </Tabs>
        </div>
      </Example>

      <Example caption="Controlled: the page keeps track of which tab is open">
        <ControlledExample />
      </Example>
    </ComponentDocs>
  )
}
