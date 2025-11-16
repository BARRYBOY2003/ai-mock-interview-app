# Author: Omkar Pathak

import io
import os
import re
import nltk
import pandas as pd
import docx2txt
from datetime import datetime
from dateutil import relativedelta
from . import constants as cs
from pdfminer.converter import TextConverter
from pdfminer.pdfinterp import PDFPageInterpreter
from pdfminer.pdfinterp import PDFResourceManager
from pdfminer.layout import LAParams
from pdfminer.pdfpage import PDFPage
from pdfminer.pdfparser import PDFSyntaxError
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords


def extract_text_from_pdf(pdf_path):
    '''
    Helper function to extract the plain text from .pdf files

    :param pdf_path: path to PDF file to be extracted (remote or local)
    :return: iterator of string of extracted text
    '''
    # https://www.blog.pythonlibrary.org/2018/05/03/exporting-data-from-pdfs-with-python/
    if not isinstance(pdf_path, io.BytesIO):
        # extract text from local pdf file
        with open(pdf_path, 'rb') as fh:
            try:
                for page in PDFPage.get_pages(
                        fh,
                        caching=True,
                        check_extractable=True
                ):
                    resource_manager = PDFResourceManager()
                    fake_file_handle = io.StringIO()
                    converter = TextConverter(
                        resource_manager,
                        fake_file_handle,
                        codec='utf-8',
                        laparams=LAParams()
                    )
                    page_interpreter = PDFPageInterpreter(
                        resource_manager,
                        converter
                    )
                    page_interpreter.process_page(page)

                    text = fake_file_handle.getvalue()
                    yield text

                    # close open handles
                    converter.close()
                    fake_file_handle.close()
            except PDFSyntaxError:
                return
    else:
        # extract text from remote pdf file
        try:
            for page in PDFPage.get_pages(
                    pdf_path,
                    caching=True,
                    check_extractable=True
            ):
                resource_manager = PDFResourceManager()
                fake_file_handle = io.StringIO()
                converter = TextConverter(
                    resource_manager,
                    fake_file_handle,
                    codec='utf-8',
                    laparams=LAParams()
                )
                page_interpreter = PDFPageInterpreter(
                    resource_manager,
                    converter
                )
                page_interpreter.process_page(page)

                text = fake_file_handle.getvalue()
                yield text

                # close open handles
                converter.close()
                fake_file_handle.close()
        except PDFSyntaxError:
            return


def get_number_of_pages(file_name):
    try:
        if isinstance(file_name, io.BytesIO):
            # for remote pdf file
            count = 0
            for page in PDFPage.get_pages(
                        file_name,
                        caching=True,
                        check_extractable=True
            ):
                count += 1
            return count
        else:
            # for local pdf file
            if file_name.endswith('.pdf'):
                count = 0
                with open(file_name, 'rb') as fh:
                    for page in PDFPage.get_pages(
                            fh,
                            caching=True,
                            check_extractable=True
                    ):
                        count += 1
                return count
            else:
                return None
    except PDFSyntaxError:
        return None


def extract_text_from_docx(doc_path):
    '''
    Helper function to extract plain text from .docx files

    :param doc_path: path to .docx file to be extracted
    :return: string of extracted text
    '''
    try:
        temp = docx2txt.process(doc_path)
        text = [line.replace('\t', ' ') for line in temp.split('\n') if line]
        return ' '.join(text)
    except KeyError:
        return ' '


def extract_text_from_doc(doc_path):
    '''
    Helper function to extract plain text from .doc files

    :param doc_path: path to .doc file to be extracted
    :return: string of extracted text
    '''
    try:
        try:
            import textract
        except ImportError:
            return ' '
        text = textract.process(doc_path).decode('utf-8')
        return text
    except KeyError:
        return ' '


def extract_text(file_path, extension):
    '''
    Wrapper function to detect the file extension and call text
    extraction function accordingly

    :param file_path: path of file of which text is to be extracted
    :param extension: extension of file `file_name`
    '''
    text = ''
    if extension == '.pdf':
        for page in extract_text_from_pdf(file_path):
            text += ' ' + page
    elif extension == '.docx':
        text = extract_text_from_docx(file_path)
    elif extension == '.doc':
        text = extract_text_from_doc(file_path)
    return text


def extract_entity_sections_grad(text):
    '''
    Helper function to extract all the raw text from sections of
    resume specifically for graduates and undergraduates

    :param text: Raw text of resume
    :return: dictionary of entities
    '''
    text_split = [i.strip() for i in text.split('\n')]
    # sections_in_resume = [i for i in text_split if i.lower() in sections]
    entities = {}
    key = False
    for phrase in text_split:
        if len(phrase) == 1:
            p_key = phrase
        else:
            p_key = set(phrase.lower().split()) & set(cs.RESUME_SECTIONS_GRAD)
        try:
            p_key = list(p_key)[0]
        except IndexError:
            pass
        if p_key in cs.RESUME_SECTIONS_GRAD:
            entities[p_key] = []
            key = p_key
        elif key and phrase.strip():
            entities[key].append(phrase)

    # entity_key = False
    # for entity in entities.keys():
    #     sub_entities = {}
    #     for entry in entities[entity]:
    #         if u'\u2022' not in entry:
    #             sub_entities[entry] = []
    #             entity_key = entry
    #         elif entity_key:
    #             sub_entities[entity_key].append(entry)
    #     entities[entity] = sub_entities

    # pprint.pprint(entities)

    # make entities that are not found None
    # for entity in cs.RESUME_SECTIONS:
    #     if entity not in entities.keys():
    #         entities[entity] = None
    return entities


def extract_entities_wih_custom_model(custom_nlp_text):
    '''
    Helper function to extract different entities with custom
    trained model using SpaCy's NER

    :param custom_nlp_text: object of `spacy.tokens.doc`
    :return: dictionary of entities
    '''
    entities = {}
    for ent in custom_nlp_text.ents:
        if ent.label_ not in entities.keys():
            entities[ent.label_] = [ent.text]
        else:
            entities[ent.label_].append(ent.text)
    for key in entities.keys():
        entities[key] = list(set(entities[key]))
    return entities


def get_total_experience(experience_list):
    '''
    Wrapper function to extract total months of experience from a resume

    :param experience_list: list of experience text extracted
    :return: total months of experience
    '''
    exp_ = []
    for line in experience_list:
        experience = re.search(
            r'(?P<fmonth>\w+.\d+)\s*(\D|to)\s*(?P<smonth>\w+.\d+|present)',
            line,
            re.I
        )
        if experience:
            exp_.append(experience.groups())
    total_exp = sum(
        [get_number_of_months_from_dates(i[0], i[2]) for i in exp_]
    )
    total_experience_in_months = total_exp
    return total_experience_in_months


def get_number_of_months_from_dates(date1, date2):
    '''
    Helper function to extract total months of experience from a resume

    :param date1: Starting date
    :param date2: Ending date
    :return: months of experience from date1 to date2
    '''
    if date2.lower() == 'present':
        date2 = datetime.now().strftime('%b %Y')
    try:
        if len(date1.split()[0]) > 3:
            date1 = date1.split()
            date1 = date1[0][:3] + ' ' + date1[1]
        if len(date2.split()[0]) > 3:
            date2 = date2.split()
            date2 = date2[0][:3] + ' ' + date2[1]
    except IndexError:
        return 0
    try:
        date1 = datetime.strptime(str(date1), '%b %Y')
        date2 = datetime.strptime(str(date2), '%b %Y')
        months_of_experience = relativedelta.relativedelta(date2, date1)
        months_of_experience = (months_of_experience.years
                                * 12 + months_of_experience.months)
    except ValueError:
        return 0
    return months_of_experience


def extract_entity_sections_professional(text):
    '''
    Helper function to extract all the raw text from sections of
    resume specifically for professionals

    :param text: Raw text of resume
    :return: dictionary of entities
    '''
    text_split = [i.strip() for i in text.split('\n')]
    entities = {}
    key = False
    for phrase in text_split:
        if len(phrase) == 1:
            p_key = phrase
        else:
            p_key = set(phrase.lower().split()) \
                    & set(cs.RESUME_SECTIONS_PROFESSIONAL)
        try:
            p_key = list(p_key)[0]
        except IndexError:
            pass
        if p_key in cs.RESUME_SECTIONS_PROFESSIONAL:
            entities[p_key] = []
            key = p_key
        elif key and phrase.strip():
            entities[key].append(phrase)
    return entities


def extract_email(text):
    '''
    Helper function to extract email id from text

    :param text: plain text extracted from resume file
    '''
    email = re.findall(r"([^@|\s]+@[^@]+\.[^@|\s]+)", text)
    if email:
        try:
            return email[0].split()[0].strip(';')
        except IndexError:
            return None


def extract_name(nlp_text, matcher):
    '''
    Helper function to extract name from spacy nlp text

    :param nlp_text: object of `spacy.tokens.doc`
    :param matcher: object of `spacy.matcher.Matcher`
    :return: string of full name
    '''
    pattern = [cs.NAME_PATTERN]

    matcher.add('NAME', None, *pattern)

    matches = matcher(nlp_text)

    for _, start, end in matches:
        span = nlp_text[start:end]
        if 'name' not in span.text.lower():
            return span.text


# def extract_mobile_number(text, custom_regex=None):
#     '''
#     Helper function to extract mobile number from text

#     :param text: plain text extracted from resume file
#     :return: string of extracted mobile numbers
#     '''
#     # Found this complicated regex on :
#     # https://zapier.com/blog/extract-links-email-phone-regex/
#     # mob_num_regex = r'''(?:(?:\+?([1-9]|[0-9][0-9]|
#     #     [0-9][0-9][0-9])\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|
#     #     [2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([0-9][1-9]|
#     #     [0-9]1[02-9]|[2-9][02-8]1|
#     #     [2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|
#     #     [2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{7})
#     #     (?:\s*(?:#|x\.?|ext\.?|
#     #     extension)\s*(\d+))?'''
#     if not custom_regex:
#         mob_num_regex = r'''(\d{3}[-\.\s]??\d{3}[-\.\s]??\d{4}|\(\d{3}\)
#                         [-\.\s]*\d{3}[-\.\s]??\d{4}|\d{3}[-\.\s]??\d{4})'''
#         phone = re.findall(re.compile(mob_num_regex), text)
#     else:
#         phone = re.findall(re.compile(custom_regex), text)
#     if phone:
#         number = ''.join(phone[0])
#         return number


def extract_mobile_number(text, custom_regex=None):
    """
    Extracts phone numbers from text (supports international formats).

    Examples:
    +216 23 456 789
    +1 (202) 555-0189
    0044 20 7946 0018
    +91-9876543210
    """
    if custom_regex:
        pattern = custom_regex
    else:
        # Regex that captures optional +country codes, parentheses, spaces, dashes, etc.
        pattern = r"""
            (?:(?:\+|00)?\d{1,3}[\s\-\(\)]*)?     # Country code, like +216 or 0044
            (?:\(?\d{1,4}\)?[\s\-\(\)]*){2,5}     # Main number groups
            (?:\#|x|ext\.?|extension)?\s*\d{0,5}   # Optional extension
        """
    
    matches = re.findall(pattern, text, flags=re.VERBOSE)
    cleaned_numbers = []

    for match in matches:
        # Clean up unnecessary characters
        number = re.sub(r"[^\d+]", "", match)  # keep digits and +
        # Require at least 7 digits (to filter out garbage)
        if len(re.sub(r"\D", "", number)) >= 7:
            cleaned_numbers.append(number)

    return cleaned_numbers[0] if cleaned_numbers else None

def extract_skills(nlp_text, noun_chunks, skills_file=None):
    '''
    Helper function to extract skills from spacy nlp text

    :param nlp_text: object of `spacy.tokens.doc`
    :param noun_chunks: noun chunks extracted from nlp text
    :return: list of skills extracted
    '''
    tokens = [token.text for token in nlp_text if not token.is_stop]
    if not skills_file:
        data = pd.read_csv(
            os.path.join(os.path.dirname(__file__), 'skills.csv')
        )
    else:
        data = pd.read_csv(skills_file)
    skills = list(data.columns.values)
    skillset = []
    # check for one-grams
    for token in tokens:
        if token.lower() in skills:
            skillset.append(token)

    # check for bi-grams and tri-grams
    for token in noun_chunks:
        token = token.text.lower().strip()
        if token in skills:
            skillset.append(token)
    return [i.capitalize() for i in set([i.lower() for i in skillset])]


def cleanup(token, lower=True):
    if lower:
        token = token.lower()
    return token.strip()


# pyresparser/utils.py

def suggest_cv_improvements(cv_data):
    """
    Generate AI-powered suggestions to improve a CV.
    
    Args:
        cv_data (dict): Dictionary containing CV data including:
            - name (str): Candidate's name
            - email (str): Email address
            - phone (str): Phone number
            - education (list): List of education entries
            - skills (list): List of skills
            - experience (list): List of work experiences
            - projects (list): List of projects
            - languages (list): List of languages known
            
    Returns:
        list: List of suggestion strings
    """
    suggestions = []
    
    # Check for missing contact information
    if not cv_data.get('email'):
        suggestions.append("🔹 Add your email address to make it easy for recruiters to contact you.")
    if not cv_data.get('phone'):
        suggestions.append("🔹 Include your phone number so employers can reach you quickly.")
    
    # Check education section
    education = cv_data.get('education', [])
    if not education or (isinstance(education, list) and len(education) == 0):
        suggestions.append("🔹 Add your education details, including your degree, institution, and graduation year.")
    elif isinstance(education, list):
        for i, edu in enumerate(education, 1):
            # Handle both string and dict formats
            if isinstance(edu, dict):
                if not edu.get('degree'):
                    suggestions.append(f"🔹 Specify the degree you earned in education entry #{i}.")
                if not edu.get('institution'):
                    suggestions.append(f"🔹 Add the name of the institution for education entry #{i}.")
            elif isinstance(edu, str) and len(edu.strip()) < 10:
                suggestions.append(f"🔹 Add more details to education entry #{i}.")
    
    # Check skills section
    skills = cv_data.get('skills', [])
    if not skills or (isinstance(skills, list) and len(skills) == 0):
        suggestions.append("🔹 Add a skills section highlighting your technical and soft skills.")
    elif isinstance(skills, list) and len(skills) < 5:
        suggestions.append("🔹 Consider adding more relevant skills to better showcase your qualifications.")
    
    # Check experience section
    experience = cv_data.get('experience', [])
    if not experience or (isinstance(experience, list) and len(experience) == 0):
        suggestions.append("🔹 Add your work experience, including job titles, companies, and key responsibilities.")
    elif isinstance(experience, list):
        for i, exp in enumerate(experience, 1):
            if isinstance(exp, dict):
                if not exp.get('title'):
                    suggestions.append(f"🔹 Add a job title for work experience entry #{i}.")
                if not exp.get('company'):
                    suggestions.append(f"🔹 Include the company name for work experience entry #{i}.")
                if not exp.get('description'):
                    suggestions.append(f"🔹 Add a description of your role and achievements for work experience entry #{i}.")
            elif isinstance(exp, str) and len(exp.strip()) < 20:
                suggestions.append(f"🔹 Add more details to work experience entry #{i}.")
    
    # Check for projects
    projects = cv_data.get('projects', [])
    if not projects or (isinstance(projects, list) and len(projects) == 0):
        suggestions.append("🔹 Include relevant projects to showcase your practical experience and skills.")
    
    # Check for languages
    languages = cv_data.get('languages', [])
    if not languages or (isinstance(languages, list) and len(languages) == 0):
        suggestions.append("🔹 List the languages you're proficient in, especially if you're applying for international roles.")
    
    # General suggestions
    if not suggestions:
        suggestions = [
            "✅ Your CV looks good! Consider these optional improvements:",
            "🔹 Add metrics to quantify your achievements (e.g., 'Increased sales by 30%')",
            "🔹 Include relevant certifications or online courses",
            "🔹 Add a professional summary at the top of your CV",
            "🔹 Consider adding a link to your LinkedIn profile or portfolio"
        ]
    else:
        suggestions.extend([
            "🔹 Use action verbs to start bullet points (e.g., 'Developed', 'Led', 'Implemented')",
            "🔹 Keep your CV concise (1-2 pages is ideal)",
            "🔹 Use consistent formatting throughout your CV"
        ])
    
    return suggestions