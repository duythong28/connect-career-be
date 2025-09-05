from selenium.webdriver.common.by import By

class vnw_crawler:
    def __init__(self, driver, sorting) -> None:
        self.driver = driver
        self.sorting = sorting
    def extract_job_card_information(self, job_element, timeout = 5):
        job_info = {
            'job_title': '',
            'job_url': '',
            'company_name': '',
            'company_url': '',
            'company_img_url': '',
            'location': [],
            'post_date': '',
            'due_date': '',
            'fields': '',
            'salary': '',
            'experience': '',
            'position': '',
            'benefits': '',
            'job_description': '',
            'requirements': ''
        }

        icon = job_element.find_element(By.XPATH, ".//*") \
            .find_element(By.XPATH, ".//*") \
            .find_element(By.XPATH, ".//*")
            