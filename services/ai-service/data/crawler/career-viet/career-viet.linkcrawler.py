# import libraries
from bs4 import BeautifulSoup
import time
from time import sleep
from random import randint
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
import csv

class career_viet_link_crawler(): 
    def __init__(self, driver) -> None:
        self.driver = driver
    def crawl_job_links(self):
        results = []
        i = 1
        url = "https://careerviet.vn/viec-lam/tat-ca-viec-lam-sortdv-trang-{}-vi.html"
        while True:
            # setup
            self.driver.get(url.format(i)) 
            time.sleep(randint(1, 3)) 

            html = self.driver.page_source 
            soup = BeautifulSoup(html, "html.parser") 
            
            # get job links and company images
            anchor_element = soup.find_all('div', class_='job-item')
            for element in anchor_element:
                tmp = []
                tmp.append(element.find('a', class_='job_link').get('href'))
                if element.find('img', class_="lazy-img").has_attr('data-src'):
                    tmp.append(element.find('img', class_='lazy-img')['data-src'])
                else:
                    tmp.append(element.find('img', class_='lazy-img')['src'])
                results.append(tmp)
            flag = soup.find('li', class_='next-page')
            if not flag:
                break
            i = i + 1
        return results

    # write all links and company images to csv file. After that, can use CareerViet_JobCrawler.py to crawl all jobs
    def write_file(self,data, output_file):
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerows(data)

if __name__ == '__main__':
    option= webdriver.ChromeOptions()
    option.add_argument("--incognito")
    driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=option)
        
    cv_link_crawler = career_viet_link_crawler(driver=driver)
    results = cv_link_crawler.crawl_job_links()
    cv_link_crawler.write_file(data=results, output_file="D:\\pet-project\\connect-career-be\\services\\ai-service\\data\\crawler\\career-viet\\career_viet_links.csv")
        
    driver.close()