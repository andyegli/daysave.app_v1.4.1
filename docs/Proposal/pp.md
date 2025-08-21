DaySave.app Project Proposal
Course: Certificate in Software Development – MCSD51
As part of Future Skills Training, Assessment 1
By: Andy Egli
Date: May 2025
Contents
Introduction 
1.1. Motivation and inspiration 
1.2. Project Team
Scope 
2.2. Constraints 
2.2. Constraints
User stories and use cases
Ethical and cultural impact
SDLC
Project timeline
Diagrams
References
1. Introduction
DaySave.app is designed to solve a modern digital problem: people frequently find valuable or interesting social media and web content but struggle to retrieve it later. Traditional bookmarking tools lack smart tagging, search, and context-aware organization. DaySave.app provides a solution by allowing users to save, tag, and comment on content, while also receiving help from AI features to summarize or categorize the content. Great applications are built with Trust, Security and Compliance in mind and for that reason DaySave.appis designed as SelfHosted first.
1.1 Motivation and inspiration
While “scripting” in IT a live time and occasionally “tinkering” with small applications I have joind FutureSkills MCSD51 to gain a more in depth and structured understanding of how software projects are coming to live. I have chosen daysave.app as my project, knowing that it may challenging in complexity and a stretch in the scope of the class. I am interested in not only the basics but also how AI can support learning and effects efficiency in aspiring developers. The application is derived from my daily needs in storing a variate of content for future research.
I ventured out and secured the daysave.app domain name to use in the project then started the research. (see alternatives_inspiration.md). To my surprise I found many similar projects, some of them even opensource and some of them commercial.
I also tried to keep the tech stack close to what has been thought in class but did want to explore technologies assisting advanced authentication (passoport) and ways to be able to change the database schema dynamically (Squalize). See the full tech stack in daysave.app/docs/md/tech_tools_accounts.md
Since I have a need in my everyday life to work with docker, cloud hosting and devops, I also wanted to learn more about devcontainers and try to create the project in such a container. And lastly, I struggled producing quality diagrams until I discovered PlantUML allowing me to generate these dynamically from code. Therefore, I included PlantUML in my tech stack.
1.2. Project Team
The project sponsor and developer is Andy Egli.
Stakeholders include Future Skills Academy tutors who will assess the project.
Users of the platform are individuals who regularly browse digital content and wish to organize it intelligently for future access.
1.3. Outcomes
The expected outcome of this project is a functioning web application (Phase 1) that includes secure registration/login, a content page to search and display saved content also features to tag, comment, share content with contacts and manage contact groups.
In a first step I am trying to implement the a proper project structure on github and implement basics in accordance with the work breakdown structure. I would like to see the schema generation come to live and some initial pages like Landing page, Login page, Content management, Contact management to meet the requirements for the assignment. Depending on the progress I hope I will be able to present the project running hosted in google cloud which is where we manage most of our client’s systems in real live and provide services for our customers.
2. Scope
Given the time constraints and limited resources, in phase 1 we will focus on delivering a properly structured and well documented project scaffold including functional web app that allows users to:
Register/login securely using email or OAuth (Google)
Save links to digital content (URLs) as URLs
Add tags, comments, content type and platform info to each item
View saved content in a tile style layout content management page
Search and sort items by tags, dates, types and platforms
Implement roles and permissions to control access to resources 
The backend will use Node.js with Express, the frontend will use EJS and Bootstrap, and MySQL/MariaDB will handle persistent data. Since our interest is in devops style deployment we aim to deliver the project containerized using devcontainers and deploy as a  GCP on Google Cloud.
2.1 Additional Phases (Out of Scope)
I leave phase numbering off at this stage as we are not sure yet in what order we are moving forward.
Deployment to google cloud implemented
CI/DI tested and implemented
Testing automation implemented
Phase: Users have contacts and groups and can share content - Share content with selected contacts or contact groups - Allow contacts to tag and comment on shared items
Contacts view shared content and can reply to shared contacts after registration
UX polished and audit implemented
AI Integration on backend for content classification summarization and transcription implemented
Stripe and PayPal integrated
Scheduled content reminders added
2.2 Constraints
Time constraint: Project end date set to 16/8/2025 Resource constraint: Single Novice Developer with limited time currently traveling in Switzerland Privacy is a big topic and we will have to investigate how the privacy laws impact the project
3. User Stories and Use Cases
User stories are detailed and documented in the repo at docs/md/daysave_user_stories.md
At this stage we have not introduced an identification system for use cases and user stories. Here are some of our key phase one User Stories and Use Cases.
3.1. User Stories:
Here some of the basic user stories following initial brainstorming:
As a guest, I want to be able to explore the home page
As a guest, I want to be able to register for a trial and become a user
As a user, I want to save and categorize interesting content.
As a user, I want to easily find my stored links a user, I want to have
As a user, I want to securely log in to be able to submit content url’s
As a user, I want to share saved content with my contacts.
As a contact, I want to view and comment on shared content.
As a admin, I want to manage users
As an admin, I want to monitor the system, view and ensure proper use.
3.2. Use Cases:
Guest, User and Admins can browse home page
Guest, User and Admin registration/login/reset password
User Content submission, tagging, commenting
User Sharing with contacts and group management
User Searching/sorting of saved content
Admin User management
Admin audit log and dashboard

4. Ethical and Cultural Impact
The DaySave.app expands traditional NZ values into a framework of responsible technology for 2025 and beyond: - Equity: regardless of culture or device, user can engage with the platform fully. - The content tagging & comments system is designed to support all language and cultural expression - Partnership: Involving diverse user groups in feedback loops. - Protection: Encrypting user data securely while in transit or at rest. - Respect Intellectual Property: No content is stored or copied - Fair Use: All comments and summaries are used for personal learning and note taking- avoid addictive behavior loops, respects copyright by not downloading media and ensures AI outputs are monitored for bias or inaccuracy.
5. SDLC Software Development Life Cycle
In this project we intend to use the Scrum methodology combined with DevOps practices. Scrum allows for fast, iterative development where features can be reviewed and improved with feedback. DevOps ensures code is tested, built, and deployed through automated pipelines.
Work will be split into weekly sprints
Tasks are tracked positionally using Trello or other suitable tool
Docker and GitHub Actions manage the CI/CD (Continuous Delivery or Continuous Deployment) pipeline if there is enough time
6. Project Timeline
The project will be developed using a Scrum sprint approach: - Week 22-23: Research, requirements, schema design, user stories,  	Project Management setup - Week 24-26: Frontend layout, user authentication (OAuth/email), sessions - Week 27-29: Content submission, tagging, search & sort dashboard - Week 30-31: Contact system and content sharing functionality - Week 32: Admin audit log, testing and documentation - Week 33: Polishing and improving - Week 34: Final deployment, report writing, peer review - Week 35: End of class
Here access to the updated project Gantt Chart
Progress will be tracked using project management tools.Diagrams and logs will be updated as the project progresses.
7. Diagrams
The project includes several supporting diagrams: - Problem Domain Sketch: Outlines the environment and core entities - Use Case Diagrams: Divided by user type UserAuth, UserContent, UserContacts, AdminPanel etc - Database Schema: Normalized tables for users, content, tags, comments, contacts and relations etc.
Diagrams are included as supporting files and visual references. As they are produced they are pushed to the git repo at /docs/diagrams/out/
8. References
Project references are managed in the repo at docs/md/daysave_references.md
Additionally, references that were provided as part of the project template:
Future Skills Academy. (2025). Software Development Workbook.
GeeksforGeeks. (n.d.). Iterative and Incremental Development (IID). Retrieved from https://www.geeksforgeeks.org/iterative-and-incremental-development-iid/
Otago University. (n.d.). Academic Integrity and Plagiarism. Retrieved from https://www.otago.ac.nz/study/academicintegrity/
As of 26/05/25 this concludes the project proposal for daysave.app v1.0.1
