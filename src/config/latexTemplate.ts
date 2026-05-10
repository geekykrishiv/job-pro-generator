export const LATEX_PREAMBLE = `\\documentclass[a4paper,10pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks,pdftex]{hyperref}
\\usepackage{fancyhdr}
\\usepackage{tabularx}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
\\addtolength{\\oddsidemargin}{-0.530in}
\\addtolength{\\evensidemargin}{-0.375in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.45in}
\\addtolength{\\textheight}{1in}
\\urlstyle{rm}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}
\\titleformat{\\section}{\\vspace{-10pt}\\scshape\\raggedright\\large}{}{0em}{}[\\color{black}\\titlerule\\vspace{-6pt}]
\\newcommand{\\resumeItem}[2]{\\item\\small{\\textbf{#1}{: #2\\vspace{-2pt}}}}
\\newcommand{\\resumeItemWithoutTitle}[1]{\\item\\small{#1\\vspace{-2pt}}}
\\newcommand{\\resumeSubheading}[4]{%
  \\vspace{-1pt}\\item
  \\begin{tabularx}{0.97\\textwidth}{X r}
    \\textbf{#1} & \\small #2 \\\\
    \\textit{\\small #3} & \\textit{\\small #4} \\\\
  \\end{tabularx}\\vspace{-5pt}}
\\newcommand{\\resumeSubItem}[2]{\\resumeItem{#1}{#2}\\vspace{-3pt}}
\\renewcommand{\\labelitemii}{$\\circ$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=*,label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=0.2in]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-4pt}}`;
