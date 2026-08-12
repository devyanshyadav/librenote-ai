import { tool } from "ai";
import { z } from "zod";
import { visualFlowDiagramTypeSchema } from "@/lib/studio/visual-flow.constants";

export const getDiagramExampleTool = tool({
  description:
    "Get complete syntax rules + multiple diverse valid Mermaid examples for a specific diagram type. Use this to learn the full grammar and patterns so you can generate correct, original diagrams instead of copying a single example.",
  inputSchema: z.object({
    diagramType: visualFlowDiagramTypeSchema.describe(
      "The diagram type identifier to retrieve rules and examples for.",
    ),
  }),
  execute: async ({ diagramType }) => {
    const knowledge: Record<string, { rules: string; examples: string[] }> = {
      // ───────────────────────────────────────────────
      // FLOWCHART
      // ───────────────────────────────────────────────
      flowchart: {
        rules: `DECLARATION: flowchart TD|LR|BT|RL (or graph)
NODE SHAPES: A[rect] A(round) A([stadium]) A[[sub]] A[(cyl)] A((circle)) A{diamond} A{{hex}} A>asym] A[/para/]
LINKS: --> --- -.-> ==> --o --x <-->  + |label|
SUBGRAPH: subgraph id [Title] ... end
STYLE: style A fill:#f9f  classDef ...  class A myClass
GOTCHA: never use lowercase "end" as node id/label.`,
        examples: [
          `flowchart TD
    Start([Start]) --> Input[/User Input/]
    Input --> Validate{Valid?}
    Validate -->|Yes| Process[Process Data]
    Validate -->|No| Error[Show Error]
    Error --> Input
    Process --> DB[(Database)]
    DB --> End([End])`,
          `flowchart LR
    A[Client] -->|HTTPS| B[API Gateway]
    B --> C{Auth?}
    C -->|OK| D[Service]
    C -->|Fail| E[401]
    D --> F[(DB)]`,
          `flowchart TB
    subgraph Frontend
        UI[React UI]
    end
    subgraph Backend
        API[Node API]
    end
    UI --> API
    API --> DB[(Postgres)]`,
          `flowchart TD
    A[Start] --> B{Condition}
    B -->|Yes| C[Action]
    B -->|No| D[Other]
    C --> E([End])
    D --> E`,
          `flowchart LR
    A@{ shape: stadium, label: "Begin" } --> B@{ shape: diam, label: "Decision" }
    B -->|Yes| C@{ shape: rect, label: "Work" }
    C --> D@{ shape: stadium, label: "Done" }`,
        ],
      },

      // ───────────────────────────────────────────────
      // SEQUENCE
      // ───────────────────────────────────────────────
      sequence: {
        rules: `DECLARATION: sequenceDiagram
PARTICIPANTS:
  participant Name
  participant Name as Alias
  actor User
  participant DB@{ "type": "database" }     // official types: boundary, control, entity, database, collections, queue
MESSAGES: A->>B  A-->>B  A-)B  A-xB  A<<->>B
ACTIVATION: A->>+B   B-->>-A
BLOCKS: loop / alt-else / opt / par-and
NOTES: Note right of A: text   Note over A,B: text
OTHER: autonumber  create participant X  destroy X
GOTCHA: wrap the word "end" if used in messages.`,
        examples: [
          `sequenceDiagram
    actor User
    participant FE as Frontend
    participant API
    participant DB@{ "type": "database" }
    User->>FE: Click Login
    FE->>API: POST /login
    activate API
    API->>DB: SELECT user
    DB-->>API: user row
    alt valid
        API-->>FE: 200 + JWT
    else invalid
        API-->>FE: 401
    end
    deactivate API`,
          `sequenceDiagram
    participant Client
    participant Server
    loop every 30s
        Client->>Server: Heartbeat
        Server-->>Client: ACK
    end`,
          `sequenceDiagram
    autonumber
    actor U as User
    participant S as Service
    U->>S: Request
    Note right of S: Validate JWT
    S-->>U: Response`,
          `sequenceDiagram
    participant A
    participant B
    participant C
    par Job1
        A->>B: Task A
    and Job2
        A->>C: Task B
    end`,
          `sequenceDiagram
    participant UI
    participant Auth
    participant DB@{ "type": "database" }
    UI->>+Auth: login(creds)
    Auth->>+DB: findUser
    DB-->>-Auth: user
    Auth-->>-UI: token`,
        ],
      },

      // ───────────────────────────────────────────────
      // CLASS
      // ───────────────────────────────────────────────
      class: {
        rules: `DECLARATION
  classDiagram

CLASS DEFINITION
  class ClassName {
      +publicField: type
      -privateField: type
      #protectedField
      ~packageField
      +publicMethod() returnType
      -privateMethod()*          (* = abstract)
      +staticMethod()$           ($ = static)
  }
  ClassName : +field
  ClassName : +method()

RELATIONSHIPS
  A <|-- B          inheritance
  A <|.. B          realization / implements
  A *-- B           composition
  A o-- B           aggregation
  A --> B           association
  A ..> B           dependency
  A ..|> B          lollipop interface
  A -- B            solid link
  A "1" --> "*" B   with multiplicity
  Multiplicity: 1, 0..1, 1..*, *, 0..*, n, 1..n, etc.

ANNOTATIONS
  <<interface>>
  <<abstract>>
  <<enumeration>>
  <<service>>

OTHER
  namespace Name { classes... }
  direction TB | LR | BT | RL
  note for ClassName "text"
  class ClassName:::styleClass

GOTCHAS
  - Visibility markers (+ - # ~) must be attached to the name (no space)
  - Return type comes after the method parentheses
  - Generic types: List~T~`,

        examples: [
          `classDiagram
    class Animal {
        <<abstract>>
        +String name
        +int age
        +makeSound()* void
    }
    class Dog {
        +String breed
        +bark() void
    }
    Animal <|-- Dog`,

          `classDiagram
    class User {
        +uuid id
        +string email
        +login() bool
        +logout() void
    }
    class Order {
        +uuid id
        +date createdAt
        +float total
    }
    User "1" --> "*" Order : places`,

          `classDiagram
    class Shape {
        <<interface>>
        +area() float
        +perimeter() float
    }
    class Circle {
        -float radius
        +area() float
    }
    Shape <|.. Circle`,

          `classDiagram
    class Car {
        +Engine engine
        +start() void
    }
    class Engine {
        +int horsepower
        +start() void
    }
    Car *-- Engine`,

          `classDiagram
    direction LR
    class Controller {
        +handleRequest()
    }
    class Service {
        +process()
    }
    class Repository {
        +save()
        +find()
    }
    Controller --> Service
    Service --> Repository`,
        ],
      },

      // ───────────────────────────────────────────────
      // ER
      // ───────────────────────────────────────────────
      er: {
        rules: `DECLARATION
  erDiagram

ENTITY + ATTRIBUTES
  ENTITY_NAME {
      type attribute_name PK
      type attribute_name FK
      type attribute_name UK
      type attribute_name
  }
  Common types: string, int, float, date, datetime, boolean, uuid, text

RELATIONSHIPS (cardinality)
  ||--||    exactly one to exactly one
  ||--o|    exactly one to zero-or-one
  ||--o{    exactly one to zero-or-many
  ||--|{    exactly one to one-or-many
  }o--o{    zero-or-many to zero-or-many
  }|--|{    one-or-many to one-or-many
  Non-identifying (dashed): use .. instead of --
  Example: A ||..o{ B : "label"

FULL STATEMENT
  ENTITY1 ||--o{ ENTITY2 : "verb phrase"

GOTCHAS
  - Entity names are usually UPPER_CASE or PascalCase
  - PK / FK / UK are suffixes after the attribute name
  - Relationship label is optional but recommended
  - Identifying relationships use solid line (--), non-identifying use dotted (..)`,

        examples: [
          `erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        string id PK
        string name
        string email UK
    }
    ORDER {
        string id PK
        string customer_id FK
        date order_date
        float total
    }`,

          `erDiagram
    USER ||--|| PROFILE : has
    USER ||--o{ POST : writes
    POST ||--o{ COMMENT : has
    USER {
        uuid id PK
        string username UK
    }
    PROFILE {
        uuid user_id PK, FK
        text bio
    }
    POST {
        uuid id PK
        uuid author_id FK
        string title
    }
    COMMENT {
        uuid id PK
        uuid post_id FK
        uuid user_id FK
        text body
    }`,

          `erDiagram
    STUDENT }o--o{ COURSE : enrolls
    STUDENT {
        int student_id PK
        string name
    }
    COURSE {
        int course_id PK
        string title
        int credits
    }`,

          `erDiagram
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    ORDER {
        string order_id PK
    }
    LINE_ITEM {
        string line_id PK
        string order_id FK
        string product_id FK
        int qty
    }
    PRODUCT {
        string product_id PK
        string name
        float price
    }`,

          `erDiagram
    EMPLOYEE ||--o{ EMPLOYEE : "manages"
    DEPARTMENT ||--|{ EMPLOYEE : employs
    DEPARTMENT {
        int dept_id PK
        string name
    }
    EMPLOYEE {
        int emp_id PK
        int dept_id FK
        int manager_id FK
        string name
    }`,
        ],
      },

      // ───────────────────────────────────────────────
      // C4
      // ───────────────────────────────────────────────
      // ───────────────────────────────────────────────
      // C4
      // ───────────────────────────────────────────────
      c4: {
        rules: `DECLARATION (choose one level per diagram)
  C4Context
  C4Container
  C4Component
  C4Dynamic
  C4Deployment

CORE ELEMENTS (Strict exact syntax)
  Person(alias, "Label", "Optional Description")
  Person_Ext(alias, "Label", "Optional Description")
  System(alias, "Label", "Optional Description")
  SystemDb(alias, "Label", "Optional Description")
  SystemQueue(alias, "Label", "Optional Description")
  System_Ext(alias, "Label", "Optional Description")
  
  Container(alias, "Label", "Technology", "Optional Description")
  ContainerDb(alias, "Label", "Technology", "Optional Description")
  ContainerQueue(alias, "Label", "Technology", "Optional Description")
  Container_Ext(alias, "Label", "Technology", "Optional Description")
  
  Component(alias, "Label", "Technology", "Optional Description")
  ComponentDb(alias, "Label", "Technology", "Optional Description")

BOUNDARIES
  Enterprise_Boundary(alias, "Label") { ... }
  System_Boundary(alias, "Label") { ... }
  Container_Boundary(alias, "Label") { ... }

RELATIONSHIPS
  Rel(fromAlias, toAlias, "Label", "Optional Technology")
  BiRel(fromAlias, toAlias, "Label", "Optional Technology")
  Rel_U(fromAlias, toAlias, "Label") // Up
  Rel_D(fromAlias, toAlias, "Label") // Down
  Rel_L(fromAlias, toAlias, "Label") // Left
  Rel_R(fromAlias, toAlias, "Label") // Right

GOTCHAS & CRITICAL RULES (AVOID FATAL ERRORS)
  - MANDATORY QUOTES: Every single label, technology, and description MUST be wrapped in double quotes. (e.g., \`System(web, "Web App")\` is valid; \`System(web, Web App)\` will crash the parser).
  - ALIAS RULES: Aliases must be a single word (no spaces, no hyphens, ideally camelCase or snake_case).
  - NO NESTING OUTSIDE BOUNDARIES: You can only nest elements inside \`*_Boundary\` blocks. Do not try to nest a Container inside a System directly without using \`System_Boundary\`.
  - OPTIONAL PARAMS: If you omit a description, just leave it out, do not pass an empty string unless necessary.
  - NEWLINES: Every declaration MUST be on its own line.`,

        examples: [
          `C4Context
    title System Context Diagram - Internet Banking System
    
    Person(customer, "Personal Banking Customer", "A customer of the bank, with personal bank accounts.")
    System(banking_system, "Internet Banking System", "Allows customers to view information about their bank accounts, and make payments.")
    
    System_Ext(mail_system, "E-mail system", "The internal Microsoft Exchange e-mail system.")
    System_Ext(mainframe, "Mainframe Banking System", "Stores all of the core banking information about customers, accounts, transactions, etc.")
    
    Rel(customer, banking_system, "Uses")
    Rel(banking_system, mail_system, "Sends e-mail using")
    Rel(banking_system, mainframe, "Uses")
    Rel(mail_system, customer, "Sends e-mails to")`,

          `C4Container
    title Container Diagram - Internet Banking System

    Person(customer, "Customer", "A customer of the bank.")
    
    System_Boundary(c1, "Internet Banking") {
        Container(web_app, "Web Application", "Java, Spring MVC", "Delivers the static content and the Internet banking SPA")
        Container(spa, "Single-Page App", "JavaScript, Angular", "Provides all the Internet banking functionality to customers via their web browser")
        Container(api, "API Application", "Java, Spring Boot", "Provides Internet banking functionality via API")
        ContainerDb(db, "Database", "Oracle", "Stores user registration information, hashed auth credentials, access logs, etc.")
    }
    
    System_Ext(mainframe, "Mainframe Banking System", "Core banking system")
    
    Rel(customer, web_app, "Uses", "HTTPS")
    Rel(customer, spa, "Uses", "HTTPS")
    Rel(web_app, spa, "Delivers", "HTTPS")
    Rel(spa, api, "Uses", "JSON/HTTPS")
    Rel(api, db, "Reads from and writes to", "JDBC")
    Rel(api, mainframe, "Uses", "XML/HTTPS")`,

          `C4Component
    title Component Diagram - API Application

    Container_Boundary(api, "API Application") {
        Component(sign_in, "Sign In Controller", "Spring MVC Rest Controller", "Allows users to sign in to the Internet Banking System")
        Component(accounts, "Accounts Summary Controller", "Spring MVC Rest Controller", "Provides customers with a summary of their bank accounts")
        Component(security, "Security Component", "Spring Bean", "Provides functionality related to signing in, changing passwords, etc.")
        ComponentDb(db, "Database", "Relational Database Schema", "Stores user registration information, hashed auth credentials, access logs, etc.")
    }

    Container(spa, "Single-Page App", "JavaScript, Angular", "Provides all the Internet banking functionality to customers via their web browser")

    Rel(spa, sign_in, "Uses", "JSON/HTTPS")
    Rel(spa, accounts, "Uses", "JSON/HTTPS")
    Rel(sign_in, security, "Uses")
    Rel(accounts, security, "Uses")
    Rel(security, db, "Reads from and writes to", "JDBC")`,

          `C4Deployment
    title Deployment Diagram - Production Environment

    Deployment_Node(aws, "Amazon Web Services", "US-East-1") {
        Deployment_Node(ecs, "Elastic Container Service", "Cluster") {
            Container(api, "API Application", "Java, Docker", "Provides Internet banking functionality")
        }
        Deployment_Node(rds, "Relational Database Service", "Aurora PostgreSQL") {
            ContainerDb(db, "Database", "PostgreSQL", "Stores user data")
        }
    }
    
    Deployment_Node(customer_computer, "Customer's Computer", "macOS/Windows") {
        Deployment_Node(browser, "Web Browser", "Chrome/Safari") {
            Container(spa, "Single-Page App", "JavaScript", "Provides banking UI")
        }
    }

    Rel(spa, api, "Makes API calls to", "JSON/HTTPS")
    Rel(api, db, "Reads/Writes", "JDBC")`,

          `C4Dynamic
    title Dynamic Diagram - Login Flow
    
    Person(user, "User", "A registered user")
    Container(spa, "Single-Page App", "JavaScript")
    Container(api, "API", "Java")
    ContainerDb(db, "Database", "PostgreSQL")
    
    Rel(user, spa, "1. Enters credentials")
    Rel(spa, api, "2. Submits POST /login", "JSON/HTTPS")
    Rel(api, db, "3. Queries user hash", "SQL")
    Rel(db, api, "4. Returns user hash", "SQL ResultSet")
    Rel(api, spa, "5. Returns JWT token", "JSON")
    Rel(spa, user, "6. Redirects to dashboard")`,
        ],
      },

      // ───────────────────────────────────────────────
      // PACKET
      // ───────────────────────────────────────────────
      packet: {
        rules: `DECLARATION
  packet-beta

TITLE (Optional)
  title Title Text

FIELD SYNTAX
  StartBit-EndBit: "Field Label"
  (e.g., 0-15: "Source Port")

GOTCHAS & CRITICAL RULES (AVOID FATAL ERRORS)
  - MANDATORY QUOTES: Every single field label MUST be wrapped in double quotes. Writing \`0-7: Version\` will cause a fatal lexer error. It MUST be \`0-7: "Version"\`.
  - NO SPACES IN RANGES: The bit range must have no spaces. \`0-7:\` is correct. \`0 - 7:\` will crash the parser.
  - CONTIGUOUS & INCREASING: Bit ranges must flow in order. You cannot declare \`16-31\` and then go backward to \`0-15\`. They must increase continuously.
  - SINGLE BITS: To represent a single bit, the start and end number must be the same (e.g., \`16-16: "ACK Flag"\`).
  - NO STYLING ATTEMPTS: Do not attempt to add colors, brackets, or CSS classes to the fields (e.g., no \`{fill: red}\`). The packet-beta parser does not support it and will crash.
  - STICK TO EXPLICIT RANGES: Always use the \`Start-End:\` format. Avoid experimental \`+8:\` syntax as it breaks older Mermaid renderers.`,

        examples: [
          `packet-beta
    title TCP Header
    0-15: "Source Port"
    16-31: "Destination Port"
    32-63: "Sequence Number"
    64-95: "Acknowledgment Number"
    96-99: "Data Offset"
    100-105: "Reserved"
    106-111: "Flags"
    112-127: "Window Size"
    128-143: "Checksum"
    144-159: "Urgent Pointer"
    160-191: "Options"`,

          `packet-beta
    title IPv4 Header
    0-3: "Version"
    4-7: "IHL"
    8-13: "DSCP"
    14-15: "ECN"
    16-31: "Total Length"
    32-47: "Identification"
    48-50: "Flags"
    51-63: "Fragment Offset"
    64-71: "Time to Live"
    72-79: "Protocol"
    80-95: "Header Checksum"
    96-127: "Source IP Address"
    128-159: "Destination IP Address"`,

          `packet-beta
    title UDP Header
    0-15: "Source Port"
    16-31: "Destination Port"
    32-47: "Length"
    48-63: "Checksum"
    64-95: "Payload Data"`,

          `packet-beta
    title Custom 32-bit Control Frame
    0-7: "Opcode"
    8-8: "Sync Flag"
    9-9: "Error Flag"
    10-15: "Reserved"
    16-31: "Session ID"`,

          `packet-beta
    title IEEE 802.1Q VLAN Tag
    0-15: "TPID (0x8100)"
    16-18: "Priority Code Point (PCP)"
    19-19: "Drop Eligible Indicator (DEI)"
    20-31: "VLAN Identifier (VID)"`,
        ],
      },

      // ───────────────────────────────────────────────
      // STATE
      // ───────────────────────────────────────────────
      state: {
        rules: `DECLARATION
  stateDiagram-v2

STATE DEFINITIONS & ALIASES
  Simple state (no spaces): StateId
  State with spaces/characters: state "My Complex State" as state_id
  
TRANSITIONS
  Source --> Destination
  Source --> Destination : Transition Label
  [*] --> StartState       (Defines the initial entry point)
  EndState --> [*]         (Defines the final exit point)

COMPOSITE (NESTED) STATES
  state ParentState {
      [*] --> Child1
      Child1 --> Child2
  }

CONCURRENCY & FORK/JOIN
  Concurrency inside a state uses \`--\` as a separator.
  Forks use: state fork_id <<fork>>
  Joins use: state join_id <<join>>

NOTES
  note right of state_id : Note text here
  note left of state_id : Note text here

GOTCHAS & CRITICAL RULES (AVOID FATAL ERRORS)
  - NO COLON DESCRIPTIONS: Do NOT use the colon syntax (e.g. \`StateId : Description\`) if the description has spaces, dashes, or special characters. Doing so causes fatal parse errors. Instead, always use the alias declaration style: \`state "My Description" as state_id\`.
  - NO SPACES IN IDs: You absolutely CANNOT have spaces in state IDs. \`User Login --> Home\` is a fatal error. You MUST use aliases: \`state "User Login" as user_login\` and then write \`user_login --> home\`.
  - USE V2: Always declare using \`stateDiagram-v2\`, never just \`stateDiagram\`.
  - NO NOTES ON ARROWS: You cannot attach a note to a transition line. Notes must be attached to a specific state ID (e.g., \`note right of StateID\`).
  - SCOPE AWARENESS: An inner state inside a composite block should define its own \`[*]\` start point.`,

        examples: [
          `stateDiagram-v2
    [*] --> idle
    state "Wait for Input" as idle
    state "Processing Data" as processing
    state "Error State" as error
    
    idle --> processing : user clicks submit
    processing --> idle : success
    processing --> error : validation failed
    error --> idle : dismiss
    idle --> [*] : timeout`,

          `stateDiagram-v2
    title E-commerce Order Flow
    [*] --> New
    
    state "Order Created" as New
    state "Payment Pending" as Pending
    state "Shipped to Customer" as Shipped
    
    New --> Pending : Proceed to checkout
    Pending --> Shipped : Payment received
    Pending --> New : Payment failed
    Shipped --> [*] : Delivered
    
    note right of Pending : Gateway takes < 2s`,

          `stateDiagram-v2
    [*] --> Active
    
    state Active {
        [*] --> NumLockOff
        NumLockOff --> NumLockOn : EvNumLockPressed
        NumLockOn --> NumLockOff : EvNumLockPressed
        --
        [*] --> CapsLockOff
        CapsLockOff --> CapsLockOn : EvCapsLockPressed
        CapsLockOn --> CapsLockOff : EvCapsLockPressed
    }
    
    Active --> [*] : PowerOff`,

          `stateDiagram-v2
    state fork_state <<fork>>
    state join_state <<join>>
    
    [*] --> Initialization
    Initialization --> fork_state : Start parallel tasks
    
    fork_state --> Task1
    fork_state --> Task2
    
    Task1 --> join_state
    Task2 --> join_state
    
    join_state --> Complete
    Complete --> [*]`,

          `stateDiagram-v2
    [*] --> draft
    
    state "Draft Article" as draft
    state "In Review" as review
    
    state review {
        [*] --> editorial
        editorial --> legal : Apprv Ed
        legal --> [*] : Apprv Leg
    }
    
    draft --> review : submit
    review --> draft : reject
    review --> published : final approval
    published --> [*]`,
        ],
      },

      // ───────────────────────────────────────────────
      // JOURNEY
      // ───────────────────────────────────────────────
      journey: {
        rules: `DECLARATION
  journey

STRUCTURE
  title My Journey Title
  section Section Name
      Task name: score: Actor1, Actor2
      Another task: 3: Actor

SCORE
  Integer 1-5 (usually) representing satisfaction / effort / importance

ACTORS
  Comma-separated list after the score

GOTCHAS
  - Every task needs a score
  - Section titles group the journey stages
  - Actors are optional but recommended for clarity`,

        examples: [
          `journey
    title Customer Purchase Journey
    section Discover
      Browse products: 5: Customer
      Search: 4: Customer
    section Decide
      Compare: 3: Customer
      Read reviews: 4: Customer
    section Buy
      Add to cart: 5: Customer
      Checkout: 3: Customer, System
      Pay: 4: Customer, System`,

          `journey
    title Onboarding
    section Signup
      Visit landing: 5: User
      Create account: 3: User
    section Setup
      Verify email: 4: User, System
      Complete profile: 2: User
    section First Value
      Create first project: 5: User`,

          `journey
    title Support Ticket
    section Report
      Find help center: 3: Customer
      Submit ticket: 4: Customer
    section Resolution
      Agent replies: 4: Agent
      Issue fixed: 5: Customer, Agent`,

          `journey
    title Mobile App First Open
    section Install
      Download: 5: User
      Open app: 5: User
    section Auth
      Sign up: 3: User
      Permissions: 2: User
    section Engage
      Tutorial: 4: User
      First action: 5: User`,

          `journey
    title Content Creation
    section Ideate
      Brainstorm: 5: Creator
    section Produce
      Write draft: 3: Creator
      Edit: 4: Creator
    section Publish
      Schedule: 5: Creator, System
      Promote: 4: Creator`,
        ],
      },

      // ───────────────────────────────────────────────
      // GIT
      // ───────────────────────────────────────────────
      git: {
        rules: `DECLARATION
  gitGraph

COMMANDS
  commit
  commit id: "message"
  commit id: "message" tag: "v1.0"
  commit type: HIGHLIGHT | REVERSE | NORMAL
  branch branchName
  checkout branchName
  switch branchName          (alias of checkout)
  merge branchName
  cherry-pick id: "commitId"

OPTIONS
  gitGraph LR:                (left-to-right orientation)
  gitGraph TB:                (top-to-bottom)

GOTCHAS
  - Commits are drawn in the order they appear in the source
  - checkout / switch change the current branch for subsequent commits
  - merge brings the named branch into the current branch`,

        examples: [
          `gitGraph
    commit id: "Initial"
    commit id: "Add login"
    branch feature/pay
    checkout feature/pay
    commit id: "Payment form"
    commit id: "Stripe integration"
    checkout main
    merge feature/pay
    commit id: "Release" tag: "v1.0"`,

          `gitGraph
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit`,

          `gitGraph
    commit id: "A"
    branch hotfix
    checkout hotfix
    commit id: "Fix"
    checkout main
    merge hotfix
    commit id: "B"`,

          `gitGraph LR:
    commit id: "start"
    branch feat
    commit id: "work"
    checkout main
    commit id: "parallel"
    merge feat`,

          `gitGraph
    commit id: "base"
    branch feature1
    branch feature2
    checkout feature1
    commit id: "f1"
    checkout feature2
    commit id: "f2"
    checkout main
    merge feature1
    merge feature2`,
        ],
      },

      // ───────────────────────────────────────────────
      // REQUIREMENT
      // ───────────────────────────────────────────────
      requirement: {
        rules: `DECLARATION
  requirementDiagram

REQUIREMENT TYPES
  requirement id {
      id: 1
      text: "..."
      risk: high | medium | low
      verifymethod: test | inspection | analysis | demonstration
  }
  functionalRequirement ...
  performanceRequirement ...
  interfaceRequirement ...
  physicalRequirement ...
  designConstraint ...

ELEMENTS
  element Name {
      type: "type"
      docref: "REF-001"
  }

RELATIONSHIPS
  req - satisfies -> element
  req - traces -> element
  req - contains -> req2
  req - derives -> req2
  req - refines -> req2
  req - copies -> req2
  element - verifies -> req

GOTCHAS
  - risk and verifymethod have limited allowed values
  - Relationships use a specific arrow style with the keyword in the middle`,

        examples: [
          `requirementDiagram
    requirement login_req {
        id: 1
        text: "Users shall log in with email and password"
        risk: high
        verifymethod: test
    }
    element webapp {
        type: "application"
    }
    login_req - satisfies -> webapp`,

          `requirementDiagram
    functionalRequirement auth {
        id: 1.1
        text: "Passwords must be hashed with bcrypt"
        risk: high
        verifymethod: inspection
    }
    performanceRequirement latency {
        id: 2
        text: "Login < 500ms for 95% of requests"
        risk: medium
        verifymethod: test
    }
    element auth_service {
        type: "service"
    }
    auth - satisfies -> auth_service
    latency - satisfies -> auth_service`,

          `requirementDiagram
    requirement parent {
        id: 1
        text: "Parent requirement"
        risk: medium
        verifymethod: analysis
    }
    requirement child {
        id: 1.1
        text: "Child requirement"
        risk: low
        verifymethod: test
    }
    parent - contains -> child`,

          `requirementDiagram
    requirement security {
        id: 10
        text: "All traffic must be HTTPS"
        risk: high
        verifymethod: demonstration
    }
    element gateway {
        type: "infrastructure"
    }
    security - satisfies -> gateway`,

          `requirementDiagram
    requirement usability {
        id: 5
        text: "Form validation must be inline"
        risk: low
        verifymethod: test
    }
    element ui {
        type: "frontend"
    }
    usability - traces -> ui`,
        ],
      },

      // ───────────────────────────────────────────────
      // KANBAN
      // ───────────────────────────────────────────────
      kanban: {
        rules: `DECLARATION
  kanban

TITLE (Optional)
  title "Your Kanban Board Title"

COLUMNS & TASKS SYNTAX
  - Columns and tasks MUST use the strict \`id[Label]\` syntax. 
  - Tasks MUST be indented (2 or 4 spaces) under their respective columns.

  columnId[Column Display Name]
      taskId[Task description text]
      anotherTaskId["Task with (special) characters!"]

METADATA (Optional tags)
  - You can append metadata to tasks using the \`@{ key: 'value' }\` syntax.
  - Supported keys: assigned, ticket, priority
  - Allowed priority values: Very High, High, Normal, Low, Very Low
  - Example: \`taskId[My Task]@{ assigned: 'Alice', ticket: 'PROJ-123', priority: 'High' }\`

GOTCHAS & CRITICAL RULES (AVOID FATAL ERRORS)
  - QUOTING SPECIAL CHARACTERS (CRITICAL): If your task or column label contains parentheses \`()\`, plus signs \`+\`, hyphens \`-\`, or colons \`:\`, you MUST wrap the label in double quotes inside the brackets. Example: \`t1["Training objectives (MLM + NSP)"]\`. Failure to quote special characters will cause a fatal parse error.
  - ALWAYS USE IDs: Never use plain text for columns or tasks. You MUST use the \`id[Label]\` format for everything (e.g., \`col1[Todo]\` and \`t1[My Task]\`).
  - STRICT INDENTATION: Tasks must be indented directly under their parent column. Inconsistent spaces will break the parser.
  - NO ARROWS: Do NOT use \`-->\` or \`--\`. Kanban is structural, not a flowchart. Tasks are grouped purely by indentation.
  - METADATA SPACING: If you use metadata, do not put spaces between the bracket and the \`@\` symbol (use \`]@{...}\`).`,

        examples: [
          `kanban
    title "Sprint 42"
    todo[To Do]
      t1[Design landing page]@{ assigned: 'UI Team', priority: 'High' }
      t2[Write API documentation]@{ ticket: 'DEV-99', priority: 'Normal' }
    doing[In Progress]
      t3[Implement auth middleware]@{ assigned: 'Alice', ticket: 'DEV-105', priority: 'Very High' }
    done[Done]
      t4[Fix login bug]@{ assigned: 'Bob', priority: 'Low' }`,

          `kanban
    title "LLM Training Pipeline"
    prep["Data Prep & Tokenization"]
      task1["Clean dataset (HTML + Markdown)"]@{ priority: 'High' }
      task2["Build vocabulary (BPE)"]
    training["Model Training"]
      task3["Training objectives (MLM + NSP)"]@{ assigned: 'ML Team', priority: 'Very High' }
      task4["Multi-GPU synchronization"]
    eval["Evaluation"]
      task5["Run benchmark suite (GLUE)"]@{ assigned: 'QA' }`,

          `kanban
    col1[Requested]
      bug1[Button misalignment on mobile]@{ priority: 'High', ticket: 'BUG-001' }
      bug2[Typo on pricing page]@{ priority: 'Low', ticket: 'BUG-002' }
    col2[Triaged]
      feat1[Add dark mode toggle]@{ assigned: 'Frontend' }
    col3[In Development]
      feat2[Stripe integration]@{ assigned: 'Backend', priority: 'Very High' }
    col4[Testing]
      test1["E2E checkout flow (Desktop + Mobile)"]@{ assigned: 'QA' }`,

          `kanban
    title "Personal Task Board"
    today[Today]
      task1[Buy groceries]
      task2[Pay utility bills]@{ priority: 'High' }
    thisWeek["This Week (Focus)"]
      task3["Schedule dentist appointment"]
      task4[Car maintenance]
    someday[Someday]
      task5["Learn Rust (Language)"]
      task6["Read sci-fi novel"]`,

          `kanban
    backlog[Product Backlog]
      story1[User can reset password]@{ ticket: 'AUTH-11', priority: 'High' }
      story2[User can upload avatar]@{ ticket: 'USER-22', priority: 'Normal' }
    sprint[Current Sprint]
      story3[Dashboard analytics]@{ assigned: 'Data Team', priority: 'Very High' }
    review[Code Review]
      story4[Optimize database queries]@{ assigned: 'DBA' }
    done[Shipped]
      story5["Setup repository (GitHub)"]@{ ticket: 'INFRA-01' }`,
        ],
      },

      // ───────────────────────────────────────────────
      // EVENT MODELING
      // ───────────────────────────────────────────────
      eventmodeling: {
        rules: `DECLARATION
  eventmodeling

SYNTAX (Time Frames)
  - Event Modeling in Mermaid does NOT use arrows (-->). It is built on "Time Frames" (tf) that automatically place items into chronological order and specific swimlanes.
  - Syntax pattern: \`tf [Number] [Type] [Identifier] { Optional JSON Data }\`

ENTITY TYPES & SWIMLANES
  - ui (or screen)          -> Places in "UI/Automation" swimlane
  - pcr (or processor)      -> Places in "UI/Automation" swimlane
  - cmd (or command)        -> Places in "Command/Read Model" swimlane
  - rmo (or readmodel)      -> Places in "Command/Read Model" swimlane
  - evt (or event)          -> Places in "Events" swimlane

GOTCHAS & CRITICAL RULES (AVOID FATAL ERRORS)
  - NO ARROWS: Do NOT use \`-->\` or \`--\`. The relationships are inferred purely by the chronological order of the Time Frame numbers.
  - UNIQUE TIME FRAMES: Every step needs a unique number (e.g., \`01\`, \`02\`, \`03\`).
  - NO SPACES IN IDENTIFIERS: Use PascalCase or camelCase for identifiers (e.g., \`CartUI\`, not \`Cart UI\`).
  - OPTIONAL DATA: You can append inline data wrapped in curly braces at the end of the line (e.g., \`{ "id": "string" }\`).`,

        examples: [
          `eventmodeling
    tf 01 ui CartUI
    tf 02 cmd AddItem
    tf 03 evt ItemAdded`,

          `eventmodeling
    tf 01 ui LoginScreen
    tf 02 cmd SubmitCredentials
    tf 03 evt UserAuthenticated
    tf 04 rmo UserProfileView
    tf 05 ui DashboardUI`,

          `eventmodeling
    timeframe 01 ui CheckoutUI
    timeframe 02 command ProcessPayment { amount: float }
    timeframe 03 event PaymentSucceeded { transactionId: string }
    timeframe 04 processor EmailProcessor
    timeframe 05 command SendReceipt
    timeframe 06 event ReceiptSent`,

          `eventmodeling
    tf 01 ui RegistrationForm
    tf 02 cmd RegisterUser { "email": "user@example.com" }
    tf 03 evt UserRegistered
    tf 04 pcr WelcomeEmailAutomation
    tf 05 cmd SendWelcomeEmail
    tf 06 evt WelcomeEmailSent`,

          `eventmodeling
    tf 01 rmo InventoryList
    tf 02 ui ProductPage
    tf 03 cmd ReserveStock
    tf 04 evt StockReserved
    tf 05 rmo UpdatedInventoryList`,
        ],
      },

      // ───────────────────────────────────────────────
      // GANTT
      // ───────────────────────────────────────────────
      gantt: {
        rules: `DECLARATION
  gantt

HEADER
  title Project Title
  dateFormat YYYY-MM-DD
  axisFormat %b %d
  excludes weekends
  todayMarker off | stroke-width:5px,...

SECTIONS
  section Section Name

TASKS
  Task name :id, startDate, duration
  Task name :id, after otherId, duration
  Task name :done, id, start, end
  Task name :active, id, start, duration
  Task name :crit, id, start, duration
  Task name :milestone, id, start, 0d

DURATION
  5d, 2w, 1h, etc. or explicit end date

GOTCHAS
  - dateFormat must match the dates you write
  - "after id" starts the task when the referenced task ends
  - Multiple tasks can be active / done / crit`,

        examples: [
          `gantt
    title Software Project
    dateFormat YYYY-MM-DD
    section Planning
    Requirements :a1, 2024-01-01, 10d
    Design       :a2, after a1, 7d
    section Dev
    Backend      :b1, after a2, 20d
    Frontend     :b2, after a2, 25d
    section Release
    Testing      :c1, after b1, 10d
    Deploy       :milestone, after c1, 0d`,

          `gantt
    title Sprint
    dateFormat YYYY-MM-DD
    section Sprint 1
    Story A :done, s1, 2024-03-01, 5d
    Story B :active, s2, 2024-03-03, 7d
    Story C :s3, after s1, 4d`,

          `gantt
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1 :t1, 2024-01-01, 30d
    Task 2 :t2, after t1, 20d
    section Phase 2
    Task 3 :crit, t3, after t2, 15d`,

          `gantt
    title Marketing Campaign
    dateFormat YYYY-MM-DD
    section Prep
    Research     :a, 2024-05-01, 7d
    Content      :b, after a, 10d
    section Launch
    Ads          :c, after b, 14d
    Analytics    :d, after c, 7d`,

          `gantt
    title Simple Timeline
    dateFormat  YYYY-MM-DD
    section Work
    Kickoff      :milestone, m1, 2024-01-01, 0d
    Development  :active, d1, 2024-01-02, 20d
    Review       :r1, after d1, 5d
    Ship         :milestone, after r1, 0d`,
        ],
      },

      // ───────────────────────────────────────────────
      // TIMELINE
      // ───────────────────────────────────────────────
      timeline: {
        rules: `DECLARATION
  timeline

STRUCTURE
  title Title Text
  section Section Name
      2020 : Event A
           : Event B
      2021 : Event C
  2022 : Event D          (no section also fine)

GOTCHAS
  - Years / periods are free text
  - Multiple events under the same period use extra : lines
  - Sections are optional but help group eras`,

        examples: [
          `timeline
    title History of Social Media
    section 2000s
        2004 : Facebook
        2005 : YouTube
        2006 : Twitter
    section 2010s
        2010 : Instagram
        2016 : TikTok`,

          `timeline
    title Company Milestones
    2019 : Founded
    2020 : Seed round
         : First 1000 users
    2022 : Series A
    2024 : Profitability`,

          `timeline
    title Product Evolution
    section v1
        2021 : MVP launch
    section v2
        2022 : Major redesign
             : Mobile app
    section v3
        2024 : AI features`,

          `timeline
    title Web Frameworks
    2010 : AngularJS
    2013 : React
    2014 : Vue
    2016 : Angular
    2019 : Svelte
    2020 : Remix / Next boom`,

          `timeline
    title Project Phases
    section Discovery
        Q1 : Interviews
           : Market research
    section Build
        Q2 : Prototype
        Q3 : Beta
    section Launch
        Q4 : Public release`,
        ],
      },

      // ───────────────────────────────────────────────
      // PIE
      // ───────────────────────────────────────────────
      pie: {
        rules: `DECLARATION
  pie
  pie showData
  pie title "My Title"
  pie showData title "My Title"

SLICES
  "Label" : value

RULES
  - Values are absolute; Mermaid calculates percentages
  - Labels must be quoted
  - showData shows the raw values on the chart
  - Negative values are invalid`,

        examples: [
          `pie title Browser Share
    "Chrome" : 65
    "Safari" : 19
    "Firefox" : 4
    "Edge" : 5
    "Other" : 7`,

          `pie showData
    title Pets
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`,

          `pie
    "Completed" : 70
    "In Progress" : 20
    "Not Started" : 10`,

          `pie title Budget Allocation
    "Engineering" : 45
    "Marketing" : 20
    "Sales" : 15
    "Operations" : 12
    "Other" : 8`,

          `pie showData title "Survey Results"
    "Very Satisfied" : 42
    "Satisfied" : 35
    "Neutral" : 15
    "Dissatisfied" : 8`,
        ],
      },

      // ───────────────────────────────────────────────
      // XY CHART
      // ───────────────────────────────────────────────
      xychart: {
        rules: `DECLARATION
  xychart-beta
  xychart-beta horizontal

TITLE (Optional but recommended)
  title "Your Chart Title"

AXES
  x-axis "Optional Label" ["Cat1", "Cat2", "Cat3"]
  y-axis "Optional Label" min --> max
  
  (Note: y-axis range is optional; if omitted, Mermaid auto-scales. If included, it must use the --> syntax)

DATA SERIES
  bar [10, 20, 30]
  line [15, 25, 22]

GOTCHAS & CRITICAL RULES (AVOID FATAL ERRORS)
  - STRICTLY NUMERICAL VALUES: Data arrays (e.g., \`bar [...]\` or \`line [...]\`) must contain ONLY raw numbers (e.g., \`4500000\` or \`4.5\`). Do NOT use suffix abbreviation letters like 'M' or 'K' (e.g., NEVER write \`4.5M\` or \`10K\`), as alphabetical characters cause immediate parser crashes.
  - NO LEGENDS ALLOWED: Do NOT use the \`legend\` keyword or try to name datasets (e.g., \`bar "Name" [...]\`). Mermaid does not support legends in xychart-beta. It will cause a fatal parse error.
  - EXACT LENGTH MATCHING: The number of items in your \`bar\` or \`line\` arrays MUST exactly match the number of categories in your \`x-axis\` array. If x-axis has 5 items, the data arrays must have exactly 5 numeric values.
  - QUOTING STRINGS: If your x-axis categories contain spaces (e.g., "Jan 2024"), you MUST wrap those specific items in double quotes inside the array.
  - COMBO CHARTS: You can combine multiple \`bar\` and \`line\` statements in the same chart, but they will remain unlabelled/un-legended. Add descriptive context in the \`title\` instead.
  - HORIZONTAL: Adding the word \`horizontal\` after the declaration flips the axes, making bars render side-to-side.`,

        examples: [
          `xychart-beta
    title "Monthly Revenue vs. Operating Costs"
    x-axis "Month" ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    y-axis "Amount (USD)" 0 --> 100000
    bar [45000, 52000, 61000, 58000, 72000, 85000]
    line [30000, 32000, 31500, 34000, 35000, 38000]`,

          `xychart-beta horizontal
    title "Q3 Cloud Infrastructure Costs"
    x-axis "Service Category" ["Compute", "Database", "Storage", "Network", "CDN"]
    y-axis "Spend ($)" 
    bar [12500, 8400, 4200, 2900, 1500]`,

          `xychart-beta
    title "Server CPU Utilization (24h)"
    x-axis ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"]
    y-axis "CPU %" 0 --> 100
    line [15, 12, 45, 88, 65, 22]
    line [10, 10, 35, 75, 50, 18]`,

          `xychart-beta
    title "Customer Support Ticket Volume"
    x-axis "Day of Week" ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    y-axis "Tickets"
    bar [245, 210, 190, 185, 160, 85, 40]`,

          `xychart-beta
    title "Website Traffic Conversion (Combo)"
    x-axis "Quarter" ["Q1 2023", "Q2 2023", "Q3 2023", "Q4 2023"]
    y-axis "Users" 0 --> 50000
    bar [35000, 42000, 38000, 48000]
    line [2100, 2900, 2400, 3600]`,
        ],
      },

      // ───────────────────────────────────────────────
      // MINDMAP
      // ───────────────────────────────────────────────
      mindmap: {
        rules: `DECLARATION: mindmap
STRUCTURE & HIERARCHY:
  - Hierarchy is defined STRICTLY by indentation (use 2 or 4 spaces consistently).
  - There must be exactly ONE root node at the zero-indentation level.
  - DO NOT use arrows (-->) or explicit links. Connections are created automatically based on indentation.
SHAPES:
  Default (no shape): Text or "Text"
  Square: [Text] or ["Text"]
  Rounded: (Text) or ("Text")
  Circle: ((Text)) or (("Text"))
  Bang: ))Text(( or ))"Text"((
  Hexagon: {{Text}} or {{"Text"}}
GOTCHA:
  - ONE NODE PER LINE (CRITICAL): You absolutely CANNOT put multiple nodes on the same line. Every single node MUST start on a new line with proper indentation (e.g. NEVER write: "Node A" ["Node B"] on a single line). Doing so causes a fatal parse error.
  - SPACES: If a node label has any spaces, you MUST enclose the label in double quotes inside the shape (e.g. root(("My Title")), ("My Section"), ["My Detail"]).
  - SPECIAL CHARACTERS: Enclose text in quotes if it has commas, parens, brackets, or other symbols.
  - NO ARROWS: Do not use flowchart link arrows.`,

        examples: [
          `mindmap
  root(("Product Launch"))
    [Marketing]
      ("Social Media")
      ("Email Campaign")
    [Engineering]
      ("Backend API")
      ("Frontend UI")
    [Sales]
      ("Training Material")
      ("Lead Generation")`,

          `mindmap
  root(("Transformer Architecture"))
    ("Attention Mechanism")
      ["Queries, Keys, Values (QKV)"]
      ["Softmax Function"]
      ["Multi-Head Attention"]
    ("Feed Forward")
      ["Linear Transformations"]
      ["ReLU Activation"]
    ("Normalization")
      ["LayerNorm"]
      ["Residual Connections"]`,

          `mindmap
  root(("Tech Stack"))
    Frontend::icon(fas fa-desktop)
      React
      TailwindCSS
    Backend::icon(fas fa-server)
      NodeJS
      PostgreSQL
    DevOps::icon(fas fa-cloud)
      Docker
      "GitHub Actions"`,

          `mindmap
  root(("Company Goals 2024"))
    [Q1]
      "Launch MVP (Beta)"
      "Hire Lead Dev"
    [Q2]
      "SOC2 Compliance"
      "Marketing Push"
    [Q3]
      "Series A Funding"
      "Expand to EU"`,

          `mindmap
  root(("Writing a Book"))
    Pre-production
      Brainstorming
      Outlining
      ["Character Design<br/>and Motivation"]
    Production
      Drafting
      Revising
    Post-production
      Editing
      Publishing
      Marketing`,
        ],
      },
      // ───────────────────────────────────────────────
      // SANKEY
      // ───────────────────────────────────────────────
      sankey: {
        rules: `DECLARATION: sankey-beta
DATA FORMAT (Strict Plain-Text CSV):
  Source,Target,Value

GOTCHAS & CRITICAL RULES (AVOID FATAL ERRORS):
  - NO QUOTES WHATSOEVER: The sankey-beta parser does NOT support double-quoted strings. Writing "Source Name" will immediately crash with a parse error. Node names must be plain, unquoted text.
  - NO SPACES IN NODE NAMES: Because quotes are banned, you cannot have spaces in node names either. Use compound words or underscores (e.g., OrganicSearch, Pre-training, WebVisit). Hyphens are acceptable.
  - NO TITLES OR STYLING: Do NOT use the title keyword, style, or classDef inside the body. Every line is read as CSV data.
  - NUMERIC VALUES ONLY: The third column MUST be a plain number (e.g., 500). Never add units like % or $.`,

        examples: [
          `sankey-beta
    OrganicSearch,WebVisit,5000
    PaidAds,WebVisit,3000
    SocialMedia,WebVisit,2000
    WebVisit,Bounce,4000
    WebVisit,ProductPage,6000
    ProductPage,Cart,1500
    ProductPage,Exit,4500
    Cart,Purchase,800
    Cart,Abandoned,700`,

          `sankey-beta
    Revenue,CostOfGoods,45
    Revenue,GrossProfit,55
    GrossProfit,OpEx,35
    GrossProfit,NetIncome,20
    OpEx,Salaries,20
    OpEx,Marketing,10
    OpEx,OfficeSpace,5`,

          `sankey-beta
    Coal,Electricity,300
    NaturalGas,Electricity,400
    Solar,Electricity,150
    Wind,Electricity,200
    Nuclear,Electricity,250
    Electricity,Residential,500
    Electricity,Commercial,400
    Electricity,Industrial,400`,

          `sankey-beta
    TotalApps,Screening,1000
    Screening,AutoRejected,400
    Screening,RecruiterScreen,600
    RecruiterScreen,HRRejected,300
    RecruiterScreen,TechInterview,300
    TechInterview,FailedTech,200
    TechInterview,FinalRound,100
    FinalRound,NoOffer,60
    FinalRound,Offer,40
    Offer,Declined,10
    Offer,Hired,30`,

          `sankey-beta
    RawMaterials,Manufacturing,100
    Components,Manufacturing,150
    Manufacturing,WarehouseA,120
    Manufacturing,WarehouseB,130
    WarehouseA,Retail,90
    WarehouseA,DirectSales,30
    WarehouseB,Retail,80
    WarehouseB,DirectSales,50`,
        ],
      },
      // ───────────────────────────────────────────────
      // QUADRANT
      // ───────────────────────────────────────────────
      quadrant: {
        rules: `DECLARATION
  quadrantChart

AXES & LABELS
  title [Chart Title]
  x-axis [Left Label] --> [Right Label]
  y-axis [Bottom Label] --> [Top Label]

QUADRANT MAPPING (Counter-Clockwise starting from Top Right)
  quadrant-1 [Top Right Label]     (High X, High Y)
  quadrant-2 [Top Left Label]      (Low X, High Y)
  quadrant-3 [Bottom Left Label]   (Low X, Low Y)
  quadrant-4 [Bottom Right Label]  (High X, Low Y)

POINTS
  Point Name: [x, y]
  "Point with Spaces": [x, y]

GOTCHAS & CRITICAL RULES
  - NORMALIZED COORDINATES: x and y MUST be decimal values between 0.0 and 1.0 (e.g., [0.75, 0.2]). Values greater than 1 or less than 0 will break the chart or render off-screen.
  - QUOTES: Wrap point names in double quotes if they contain spaces, colons, or special characters to prevent parsing errors.
  - AXIS ARROWS: The \`-->\` syntax in axes is mandatory.
  - ALL QUADRANTS OPTIONAL: You don't have to define all 4 quadrants, but if you do, respect the 1-4 mapping order.`,

        examples: [
          `quadrantChart
    title "Agile Prioritization: Value vs. Complexity"
    x-axis "Low Complexity" --> "High Complexity"
    y-axis "Low Value" --> "High Value"
    quadrant-1 "Strategic / Long Term"
    quadrant-2 "Quick Wins"
    quadrant-3 "Maybe Later"
    quadrant-4 "Time Sink"
    "SSO Integration": [0.85, 0.90]
    "Dark Mode": [0.20, 0.75]
    "Legacy Refactor": [0.90, 0.30]
    "Update Favicon": [0.10, 0.15]`,

          `quadrantChart
    title "Cybersecurity Threat Matrix"
    x-axis "Low Probability" --> "High Probability"
    y-axis "Low Impact" --> "High Impact"
    quadrant-1 "Critical (Mitigate ASAP)"
    quadrant-2 "High (Monitor Closely)"
    quadrant-3 "Low (Acceptable Risk)"
    quadrant-4 "Medium (Implement Controls)"
    "Ransomware Attack": [0.65, 0.95]
    "Phishing Emails": [0.90, 0.60]
    "Zero-Day Exploit": [0.15, 0.90]
    "Hardware Failure": [0.30, 0.40]
    "Insider Threat": [0.45, 0.75]`,

          `quadrantChart
    title "Gartner-Style Market Positioning"
    x-axis "Niche Vision" --> "Completeness of Vision"
    y-axis "Low Execution" --> "High Ability to Execute"
    quadrant-1 "Leaders"
    quadrant-2 "Challengers"
    quadrant-3 "Niche Players"
    quadrant-4 "Visionaries"
    "MegaCorp Inc.": [0.88, 0.92]
    "Startup Alpha": [0.95, 0.45]
    "Steady Systems": [0.30, 0.80]
    "Local Solutions": [0.20, 0.30]`,

          `quadrantChart
    title "Employee Skill Matrix & Growth"
    x-axis "Low Proficiency" --> "High Proficiency"
    y-axis "Low Interest" --> "High Interest"
    quadrant-1 "Core Strengths"
    quadrant-2 "Growth Areas"
    quadrant-3 "Avoid / Delegate"
    quadrant-4 "Burnout Risk"
    "React / Frontend": [0.90, 0.85]
    "Database Tuning": [0.30, 0.90]
    "Writing Documentation": [0.80, 0.20]
    "Legacy PHP Ops": [0.40, 0.10]
    "Public Speaking": [0.15, 0.60]`,

          `quadrantChart
    title "Marketing Channel ROI Assessment"
    x-axis "Low Cost" --> "High Cost"
    y-axis "Low Conversion" --> "High Conversion"
    quadrant-1 "Premium Performers"
    quadrant-2 "Hidden Gems"
    quadrant-3 "Ineffective"
    quadrant-4 "Money Pits"
    "Organic SEO": [0.25, 0.85]
    "Super Bowl Ad": [0.95, 0.90]
    "LinkedIn Sponsored": [0.75, 0.60]
    "Cold Calling": [0.40, 0.15]
    "Print Billboards": [0.80, 0.30]`,
        ],
      },

      // ───────────────────────────────────────────────
      // RADAR
      // ───────────────────────────────────────────────
      radar: {
        rules: `DECLARATION
  radar-beta

TITLE (Optional but recommended)
  title "Your Chart Title"

AXES (The Metrics)
  - You MUST use the ID["Label"] syntax if your label has spaces. 
  - Multiple axes can be separated by commas on the same line, or put on multiple lines.
  axis id1["Label One"], id2["Label Two"], id3["Label Three"]

CURVES (The Data Series)
  - You MUST use the 'curve' keyword (NOT 'dataset').
  - You MUST use the ID["Label"] syntax for the series name.
  - Data values are wrapped in CURLY BRACES {v1, v2, v3}.
  curve c1["Series Name"]{10, 20, 30}

SCALING OPTIONS (Optional)
  max 100
  min 0
  ticks 5

GOTCHAS & CRITICAL RULES (AVOID FATAL ERRORS)
  - NO SPECIAL CHARACTERS IN LABELS: Axis and curve labels inside double quotes (e.g. \`["Label"]\`) must NOT contain parentheses \`()\`, slashes \`/\`, colons \`:\`, or brackets \`[]\` (e.g. use \`["Performance GLUE"]\` instead of \`["Performance (GLUE)"]\`). These characters cause layout calculation failures and render crashes.
  - USE 'curve' KEYWORD: Never use the word 'dataset'. It will crash the parser.
  - ID SYNTAX IS MANDATORY: You cannot just write \`axis "My Label"\`. You MUST assign an ID like \`axis m["My Label"]\`. 
  - CURLY BRACES FOR DATA: You must use \`{10, 20, 30}\`. Using square brackets \`[10, 20]\` will crash the parser.
  - EXACT LENGTH MATCHING: The number of values in EVERY curve MUST exactly match the number of metrics defined in the \`axis\` statements. A mismatch causes a fatal parse error.
  - NO TRAILING COMMAS: Ensure there is no comma at the end of an \`axis\` list.`,

        examples: [
          `radar-beta
    title "Player Stats Comparison"
    axis sp["Speed"], pw["Power"], st["Stamina"]
    axis tc["Technique"], mt["Mentality"]
    curve pA["Player A"]{90, 75, 85, 80, 70}
    curve pB["Player B"]{70, 90, 75, 85, 80}
    max 100
    min 0`,

          `radar-beta
    title "Frontend vs Backend Developer Profile"
    axis ui["UI/UX"], css["CSS/Styling"], api["API Design"], db["Database Admin"], cl["Cloud Infra"]
    curve fdev["Frontend Focus"]{95, 90, 60, 40, 50}
    curve bdev["Backend Focus"]{40, 30, 95, 90, 80}
    max 100
    min 0
    ticks 4`,

          `radar-beta
    title "SaaS Product Comparison"
    axis p["Performance"], u["Usability"], s["Security"], c["Cost-Efficiency"]
    curve us["Our Product"]{85, 90, 80, 88}
    curve x["Competitor X"]{70, 65, 90, 60}
    curve y["Competitor Y"]{90, 80, 60, 50}
    max 100
    min 0`,

          `radar-beta
    title "Language Skills"
    axis en["English"], fr["French"], es["Spanish"], de["German"]
    curve alice["Alice"]{90, 40, 20, 10}
    curve bob["Bob"]{100, 80, 50, 60}
    max 100
    min 0`,

          `radar-beta
    title "LLM Training Tradeoffs"
    axis attn["Attention Mech"], pre["Pre-training"], scale["Model Scaling"]
    axis perf["Performance GLUE"], eff["Training Efficiency"]
    curve m1["Model Alpha"]{80, 85, 100, 75, 90}
    curve m2["Model Beta"]{95, 95, 60, 90, 85}
    max 100
    min 0`,
        ],
      },

      // ───────────────────────────────────────────────
      // TREEMAP
      // ───────────────────────────────────────────────
      treemap: {
        rules: `DECLARATION: treemap
STRUCTURE:
  title "Title"
  "Root"
      "Child1": value
      "Child2": value
          "Grandchild": value

RULES:
  - Indentation creates hierarchy
  - Leaf nodes have numeric values
  - Values determine area size
  - Nested objects create nested rectangles`,

        examples: [
          `treemap
    title Disk Usage
    "src"
      "components": 45
      "pages": 30
      "utils": 12
    "public"
      "images": 120
      "fonts": 25
    "node_modules": 850`,

          `treemap
    title Budget
    "Engineering": 40
    "Marketing": 25
    "Sales": 20
    "Operations": 15`,

          `treemap
    title Company
    "Product"
      "Design": 8
      "Engineering": 25
    "Go-to-Market"
      "Sales": 15
      "Marketing": 12
    "G&A": 10`,

          `treemap
    title Memory
    "Heap"
      "Objects": 120
      "Strings": 45
    "Stack": 30
    "Code": 60`,

          `treemap
    title Market Share
    "Mobile"
      "iOS": 28
      "Android": 42
    "Desktop"
      "Windows": 18
      "macOS": 8
      "Linux": 4`,
        ],
      },

      // ───────────────────────────────────────────────
      // VENN
      // ───────────────────────────────────────────────
      venn: {
        rules: `DECLARATION: venn-beta
SYNTAX:
  set SetName
  set SetName["Display Label"]
  set SetName["Label"]:20          // optional size
  union SetA,SetB["Overlap Label"]
  union SetA,SetB,SetC["Triple"]
  text NodeId["Text inside set"]   // indented under set/union
GOTCHA: This is a newer diagram type (v11.13+). Identifiers in union must be previously declared with set.`,
        examples: [
          `venn-beta
    title Team Skills
    set Frontend
    set Backend
    union Frontend,Backend["Fullstack"]`,
          `venn-beta
    set A["Alpha"]
    set B["Beta"]
    set C["Gamma"]
    union A,B["AB"]
    union A,B,C["All"]`,
          `venn-beta
    set Desirable
    set Feasible
    set Viable
    union Desirable,Feasible,Viable["Innovation"]`,
          `venn-beta
    set Frontend["Frontend"]:30
    set Backend["Backend"]:25
    union Frontend,Backend["Shared"]:8`,
          `venn-beta
    set A["Frontend"]
      text t1["React"]
    set B["Backend"]
      text t2["API"]
    union A,B["Shared"]
      text t3["OpenAPI"]`,
        ],
      },
      // ───────────────────────────────────────────────
      // ISHIKAWA
      // ───────────────────────────────────────────────
      ishikawa: {
        rules: `DECLARATION: ishikawa-beta
STRUCTURE:
  title Root Cause Title
  Effect Name
      Category1
          Cause A
          Cause B
      Category2
          Cause C
Classic categories: People, Process, Tools, Environment, Materials, Measurement
GOTCHA: Newer type (v11.13+). Indentation defines the fishbone hierarchy.`,
        examples: [
          `ishikawa-beta
    title Delayed Releases
    Delayed Releases
      People
        Lack of training
        Unclear ownership
      Process
        No definition of done
        Missing reviews
      Tools
        Slow CI
        Flaky tests`,
          `ishikawa-beta
    title High Churn
    Customer Churn
      Product
        Missing features
        Poor UX
      Support
        Slow response
      Pricing
        Too expensive`,
          `ishikawa-beta
    title Production Bugs
    Bugs
      Code
        Insufficient tests
      Review
        Rushed PRs
      Deploy
        No canary`,
          `ishikawa-beta
    title Low Conversion
    Low Conversion
      Traffic
        Wrong audience
      Page
        Slow load
        Confusing CTA
      Trust
        No testimonials`,
          `ishikawa-beta
    title Server Outages
    Outages
      Infrastructure
        Single point of failure
      Code
        Memory leaks
      Process
        No runbooks`,
        ],
      },
    };

    const entry = knowledge[diagramType];
    if (!entry) {
      return { error: "No knowledge found for this diagram type." };
    }

    return {
      diagramType,
      rules: entry.rules,
      examples: entry.examples,
      guidance:
        "Study the RULES carefully first. Then look at the EXAMPLES to see different valid patterns. When generating a new diagram, follow the rules and create an original diagram that fits the user's request — do not copy any example verbatim.",
    };
  },
});
