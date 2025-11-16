# Author: Omkar Pathak

import os
import multiprocessing as mp
import io
import spacy
import pprint
from spacy.matcher import Matcher
import utils.custom_utils as utils
import re

class ResumeParser(object):

    def __init__(
        self,
        resume,
        skills_file=None,
        custom_regex=None
    ):
        nlp = spacy.load('en_core_web_sm')
        custom_nlp = spacy.load(os.path.dirname(os.path.abspath(__file__)))
        self.__skills_file = skills_file
        self.__custom_regex = custom_regex
        self.__matcher = Matcher(nlp.vocab)
        self.__details = {
            'name': None,
            'email': None,
            'mobile_number': None,
            'skills': None,
            'college_name': None,
            'degree': None,
            'designation': None,
            'experience': None,
            'company_names': None,
            'no_of_pages': None,
            'total_experience': None,
            'suggestions': None,  # <-- added field to hold CV improvement suggestions
        }
        self.__resume = resume
        if not isinstance(self.__resume, io.BytesIO):
            ext = os.path.splitext(self.__resume)[1].split('.')[1]
        else:
            ext = self.__resume.name.split('.')[1]
        self.__text_raw = utils.extract_text(self.__resume, '.' + ext)
        self.__text = ' '.join(self.__text_raw.split())
        self.__nlp = nlp(self.__text)
        self.__custom_nlp = custom_nlp(self.__text_raw)
        self.__noun_chunks = list(self.__nlp.noun_chunks)
        self.__get_basic_details()

    def get_extracted_data(self):
        return self.__details

    def __get_basic_details(self):
        cust_ent = utils.extract_entities_wih_custom_model(
                            self.__custom_nlp
                        )
        name = utils.extract_name(self.__nlp, matcher=self.__matcher)
        email = utils.extract_email(self.__text)
        mobile = utils.extract_mobile_number(self.__text, self.__custom_regex)
        skills = utils.extract_skills(
                    self.__nlp,
                    self.__noun_chunks,
                    self.__skills_file
                )
        # edu = utils.extract_education(
        #               [sent.string.strip() for sent in self.__nlp.sents]
        #       )
        entities = utils.extract_entity_sections_grad(self.__text_raw)
        education = extract_education_from_resume(self.__nlp)
        self.__details['education'] = education
        # extract name
        try:
            self.__details['name'] = cust_ent['Name'][0]
        except (IndexError, KeyError):
            self.__details['name'] = name

        # extract email
        self.__details['email'] = email

        # extract mobile number
        self.__details['mobile_number'] = mobile

        # extract skills
        self.__details['skills'] = skills

        # extract college name
        try:
            self.__details['college_name'] = entities['College Name']
        except KeyError:
            pass

        # extract education Degree
        try:
            self.__details['degree'] = cust_ent['Degree']
        except KeyError:
            pass

        # extract designation
        try:
            self.__details['designation'] = cust_ent['Designation']
        except KeyError:
            pass

        # extract company names
        try:
            self.__details['company_names'] = cust_ent['Companies worked at']
        except KeyError:
            pass

        try:
            self.__details['experience'] = entities['experience']
            try:
                exp = round(
                    utils.get_total_experience(entities['experience']) / 12,
                    2
                )
                self.__details['total_experience'] = exp
            except KeyError:
                self.__details['total_experience'] = 0
        except KeyError:
            self.__details['total_experience'] = 0
        self.__details['no_of_pages'] = utils.get_number_of_pages(
                                            self.__resume
                                        )

        # Build a minimal CV dict and request improvement suggestions
        cv_data = {
            "name": self.__details.get("name"),
            "email": self.__details.get("email"),
            "phone": self.__details.get("mobile_number"),
            "education": self.__details.get("education") or [],
            "skills": self.__details.get("skills") or [],
            "experience": self.__details.get("experience") or [],
            "projects": [],      # not extracted here, keep empty
            "languages": []      # not extracted here, keep empty
        }
        try:
            self.__details['suggestions'] = utils.suggest_cv_improvements(cv_data)
        except Exception:
            # ensure parser doesn't fail if suggestions helper has issues
            self.__details['suggestions'] = None
        return


def resume_result_wrapper(resume):
    parser = ResumeParser(resume)
    return parser.get_extracted_data()


# def extract_education_from_resume(doc):
#     import re
#     education_keywords = [
#         "university", "college", "institute", "faculty", "school", "academy",
#         "department", "baccalaureate", "degree", "diploma", "phd", "master",
#         "bachelor", "high school"
#     ]
#     contact_patterns = [r"\+216", r"[0-9]{8,}", r"@"]  # phone/email patterns
#     section_headers = ["experience", "skills", "projects", "certifications", "languages", "contact"]

#     lines = doc.text.splitlines()
#     capture = False
#     education_entries = []

#     for idx, line in enumerate(lines):
#         lower_line = line.lower()
#         if "education" in lower_line:
#             capture = True
#             continue
#         if capture:
#             if any(h in lower_line for h in section_headers):
#                 break
#             if any(re.search(p, line) for p in contact_patterns):
#                 continue
#             if any(k in lower_line for k in education_keywords):
#                 current_entry = line.strip()
#                 next_line = lines[idx+1].strip() if idx+1 < len(lines) else ""
#                 if next_line and not any(h in next_line.lower() for h in section_headers):
#                     current_entry += " " + next_line
#                 education_entries.append(current_entry)

#     # Backup with spaCy entities
#     for ent in doc.ents:
#         if ent.label_ == "ORG" and any(k in ent.text.lower() for k in education_keywords):
#             education_entries.append(ent.text.strip())

#     return list(set(education_entries))

import re

def extract_education_from_resume(doc):
    """
    Extracts education info (degree + institution) from a parsed resume (spaCy Doc).
    Handles broken line merges (e.g., URLs + education text in same line).
    """

    education_keywords = [
        "university", "college", "institute", "faculty", "school", "academy",
        "baccalaureate", "degree", "diploma", "phd", "master",
        "bachelor", "licence", "engineering", "mathematics", "science"
    ]
    section_headers = [
        "experience", "work", "projects", "skills",
        "certifications", "languages", "contact"
    ]

    # Clean raw text
    text = doc.text

    # 👉 Split URL-attached lines into separate parts
    text = re.sub(r"(https?://\S+)", r"\1\n", text)

    # 👉 Remove raw URLs (completely drop them)
    text = re.sub(r"https?://\S+|www\.\S+", "", text)

    # 👉 Normalize spacing
    text = re.sub(r"\s{2,}", " ", text)

    # Split into clean lines
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    capture = False
    education_entries = []

    for i, line in enumerate(lines):
        lower_line = line.lower()

        # Start capturing after the 'Education' section header
        if "education" in lower_line:
            capture = True
            continue

        # Stop when reaching another section header
        if capture and any(h in lower_line for h in section_headers):
            break

        # Skip obvious noise lines (emails, phone numbers, etc.)
        if re.search(r"@|\d{7,}|[+]?\d{2,}", line):
            continue

        # Detect education-related lines
        if any(k in lower_line for k in education_keywords):
            # Merge with next line only if likely related (school name)
            next_line = lines[i+1].strip() if i+1 < len(lines) else ""
            if next_line:
                if not re.search(r"@|https?://|www\.", next_line) and not any(h in next_line.lower() for h in section_headers):
                    # Add next line if short and looks like institution
                    if len(next_line.split()) < 8 and any(c.isupper() for c in next_line):
                        line += " - " + next_line
            education_entries.append(line)

    # Backup: extract org names from spaCy entities
    for ent in doc.ents:
        if ent.label_ == "ORG" and any(k in ent.text.lower() for k in education_keywords):
            education_entries.append(ent.text.strip())

    # Deduplicate and clean
    cleaned = []
    for e in set(education_entries):
        e = re.sub(r"\s+", " ", e).strip(" -•–")
        if len(e) > 3 and not re.search(r"https?://|www\.|@", e):
            cleaned.append(e)

    return cleaned


if __name__ == '__main__':
    pool = mp.Pool(mp.cpu_count())

    resumes = []
    data = []
    for root, directories, filenames in os.walk('resumes'):
        for filename in filenames:
            file = os.path.join(root, filename)
            resumes.append(file)

    results = [
        pool.apply_async(
            resume_result_wrapper,
            args=(x,)
        ) for x in resumes
    ]

    results = [p.get() for p in results]

    pprint.pprint(results)
